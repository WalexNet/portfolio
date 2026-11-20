
(() => {
    "use strict";

    const KEYS = {
        vlans: "walex_vlan_designer_v1",
        interfaces: "walex_vlan_interfaces_v1",
        mappings: "walex_vlan_vendor_ports_v1",
        metadata: "walex_vlan_project_meta_v1"
    };

    const FORMAT = "walex-vlan-project";
    const VERSION = 1;
    const MAX_FILE_SIZE = 1024 * 1024;

    const VENDORS = [
        "cisco", "huawei", "aruba", "fortiswitch"
    ];

    const vendorPatterns = {
        cisco: /^[A-Za-z][A-Za-z0-9/._:-]{0,63}$/,
        huawei: /^(?:GigabitEthernet|XGigabitEthernet|10GE|25GE|40GE|100GE|Eth-Trunk)\d+(?:\/\d+)*$/i,
        aruba: /^(?:\d+\/\d+\/\d+(?::\d+)?|lag\d+)$/i,
        fortiswitch: /^port\d+$/i
    };

    const logicalNamePattern = /^[A-Za-z][A-Za-z0-9/._:-]{0,63}$/;
    const hostnamePattern = /^[A-Za-z][A-Za-z0-9-]{0,62}$/;

    const exportButton = document.getElementById("project-export");
    const importButton = document.getElementById("project-import");
    const fileInput = document.getElementById("project-file");
    const message = document.getElementById("project-message");
    const vendorInput = document.getElementById("config-vendor");
    const hostnameInput = document.getElementById("config-hostname");

    function showMessage(text, type = "error") {
        message.textContent = text;
        message.className = text
            ? `vlan-message ${type}`
            : "";
    }

    function readJSON(key, fallback) {
        const raw = localStorage.getItem(key);
        return raw === null ? fallback : JSON.parse(raw);
    }

    function isObject(value) {
        return value !== null &&
            typeof value === "object" &&
            !Array.isArray(value);
    }

    function validVlanId(id) {
        return Number.isInteger(id) &&
            id >= 1 && id <= 4094;
    }

    function validSubnet(value) {
        if (value === "") return true;

        const parts = value.split("/");
        if (parts.length !== 2 ||
            !/^\d{1,2}$/.test(parts[1])) {
            return false;
        }

        const prefix = Number(parts[1]);
        if (prefix > 32) return false;

        const octets = parts[0].split(".");
        if (octets.length !== 4) return false;

        if (!octets.every(o =>
            /^(0|[1-9]\d{0,2})$/.test(o) &&
            Number(o) <= 255
        )) {
            return false;
        }

        const address = octets.reduce(
            (acc, o) => ((acc << 8) | Number(o)) >>> 0,
            0
        );

        const mask = prefix === 0
            ? 0
            : (0xFFFFFFFF << (32 - prefix)) >>> 0;

        return ((address & mask) >>> 0) === address;
    }

    function validateProject(project) {
        if (!isObject(project) ||
            project.format !== FORMAT ||
            project.version !== VERSION) {
            throw new Error(
                "Formato de proyecto no reconocido o versión incompatible."
            );
        }

        if (!Array.isArray(project.vlans) ||
            !Array.isArray(project.interfaces) ||
            !isObject(project.mappings) ||
            !isObject(project.switch)) {
            throw new Error(
                "El proyecto no contiene una estructura válida."
            );
        }

        if (project.vlans.length > 4094 ||
            project.interfaces.length > 2048 ||
            Object.keys(project.mappings).length > 8192) {
            throw new Error("El proyecto supera los límites admitidos.");
        }

        const ids = new Set();

        for (const vlan of project.vlans) {
            if (!isObject(vlan) ||
                !validVlanId(vlan.id) ||
                typeof vlan.name !== "string" ||
                !vlan.name.trim() ||
                vlan.name.length > 64 ||
                typeof vlan.subnet !== "string" ||
                typeof vlan.description !== "string" ||
                vlan.description.length > 200 ||
                /[\r\n\x00-\x1f\x7f]/.test(vlan.name + vlan.description) ||
                !validSubnet(vlan.subnet)) {
                throw new Error("Existe una VLAN con datos inválidos.");
            }

            if (ids.has(vlan.id)) {
                throw new Error(`VLAN ${vlan.id} duplicada.`);
            }

            ids.add(vlan.id);
        }

        const names = new Set();

        for (const iface of project.interfaces) {
            if (!isObject(iface) ||
                typeof iface.name !== "string" ||
                !logicalNamePattern.test(iface.name) ||
                !["access", "trunk"].includes(iface.mode) ||
                !Array.isArray(iface.vlans) ||
                !iface.vlans.length ||
                typeof iface.description !== "string" ||
                iface.description.length > 200 ||
                /[\r\n\x00-\x1f\x7f]/.test(iface.description)) {
                throw new Error(
                    "Existe una interfaz con datos inválidos."
                );
            }

            const name = iface.name.toLowerCase();

            if (names.has(name)) {
                throw new Error(
                    `Interfaz duplicada: ${iface.name}.`
                );
            }

            names.add(name);

            const ifaceIds = new Set();

            for (const id of iface.vlans) {
                if (!validVlanId(id) || !ids.has(id)) {
                    throw new Error(
                        `${iface.name} utiliza una VLAN inexistente.`
                    );
                }

                if (ifaceIds.has(id)) {
                    throw new Error(
                        `${iface.name} contiene VLAN duplicadas.`
                    );
                }

                ifaceIds.add(id);
            }

            if (iface.mode === "access" &&
                iface.vlans.length !== 1) {
                throw new Error(
                    `${iface.name} requiere una única VLAN Access.`
                );
            }

            if (iface.native !== null &&
                iface.native !== undefined &&
                (!validVlanId(iface.native) ||
                 !ids.has(iface.native))) {
                throw new Error(
                    `VLAN nativa inválida en ${iface.name}.`
                );
            }

            if (iface.mode === "access" &&
                iface.native !== null &&
                iface.native !== undefined) {
                throw new Error(
                    `${iface.name} es Access y no admite VLAN nativa separada.`
                );
            }
        }

        const mappedNames = new Map();

        for (const [key, port] of Object.entries(project.mappings)) {
            const separator = key.indexOf(":");

            if (separator < 1 ||
                typeof port !== "string" ||
                port.length > 64) {
                throw new Error(
                    "Existe una correspondencia de puerto inválida."
                );
            }

            const vendor = key.slice(0, separator);
            const logicalName = key.slice(separator + 1);

            if (!VENDORS.includes(vendor) ||
                !logicalNamePattern.test(logicalName)) {
                throw new Error(
                    "Fabricante o interfaz lógica no reconocidos."
                );
            }

            // Se conservan las asignaciones antiguas por
            // compatibilidad con el editor actual.
            if (port !== "" && !vendorPatterns[vendor].test(port)) {
                throw new Error(
                    `Puerto físico inválido: ${port}.`
                );
            }

            if (port !== "" && names.has(logicalName.toLowerCase())) {
                const physicalKey = `${vendor}:${port.toLowerCase()}`;

                if (mappedNames.has(physicalKey)) {
                    throw new Error(
                        `Puerto físico duplicado: ${port}.`
                    );
                }

                mappedNames.set(physicalKey, true);
            }
        }

        const { vendor, hostname } = project.switch;

        if (!VENDORS.includes(vendor) ||
            typeof hostname !== "string" ||
            (hostname !== "" &&
             (!hostnamePattern.test(hostname) ||
              hostname.endsWith("-")))) {
            throw new Error(
                "El fabricante o hostname del proyecto no es válido."
            );
        }

        return true;
    }

    function createProject() {
        const project = {
            format: FORMAT,
            version: VERSION,
            exported_at: new Date().toISOString(),
            switch: {
                vendor: vendorInput.value,
                hostname: hostnameInput.value.trim()
            },
            vlans: readJSON(KEYS.vlans, []),
            interfaces: readJSON(KEYS.interfaces, []),
            mappings: readJSON(KEYS.mappings, {})
        };

        validateProject(project);
        return project;
    }

    function downloadProject(project) {
        const content = JSON.stringify(project, null, 2) + "\n";

        const blob = new Blob(
            [content],
            { type: "application/json;charset=utf-8" }
        );

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        const hostname = project.switch.hostname || "switch";

        link.href = url;
        link.download = `${hostname}-vlan-project.json`;

        document.body.appendChild(link);
        link.click();
        link.remove();

        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    function saveMetadata() {
        try {
            localStorage.setItem(
                KEYS.metadata,
                JSON.stringify({
                    vendor: vendorInput.value,
                    hostname: hostnameInput.value.trim()
                })
            );
        } catch {
            showMessage(
                "No se pudieron guardar las preferencias del proyecto."
            );
        }
    }

    function restoreMetadata() {
        try {
            const data = readJSON(KEYS.metadata, null);
            if (!isObject(data)) return;

            if (VENDORS.includes(data.vendor)) {
                vendorInput.value = data.vendor;
            }

            if (typeof data.hostname === "string") {
                hostnameInput.value = data.hostname;
            }

            vendorInput.dispatchEvent(new Event("change"));
            hostnameInput.dispatchEvent(new Event("input"));

        } catch {
            // Mantener los valores actuales si hay
            // un problema con los metadatos guardados.
        }
    }

    function replaceProject(project) {
        const values = {
            [KEYS.vlans]: JSON.stringify(project.vlans),
            [KEYS.interfaces]: JSON.stringify(project.interfaces),
            [KEYS.mappings]: JSON.stringify(project.mappings),
            [KEYS.metadata]: JSON.stringify(project.switch)
        };

        const backup = {};

        for (const key of Object.keys(values)) {
            backup[key] = localStorage.getItem(key);
        }

        try {
            for (const [key, value] of Object.entries(values)) {
                localStorage.setItem(key, value);
            }
        } catch (error) {
            // Recuperar los valores anteriores.
            for (const [key, value] of Object.entries(backup)) {
                try {
                    if (value === null) {
                        localStorage.removeItem(key);
                    } else {
                        localStorage.setItem(key, value);
                    }
                } catch {
                    // No se pudo recuperar esta clave.
                }
            }

            throw new Error(
                "No se pudo guardar el proyecto. " +
                "Los datos anteriores podrían requerir recuperación."
            );
        }
    }

    exportButton.addEventListener("click", () => {
        try {
            const project = createProject();
            downloadProject(project);
            saveMetadata();

            showMessage(
                "Proyecto preparado para descargar.",
                "success"
            );
        } catch (error) {
            showMessage(error.message);
        }
    });

    importButton.addEventListener("click", () => {
        fileInput.click();
    });

    fileInput.addEventListener("change", async () => {
        const file = fileInput.files?.[0];

        if (!file) return;

        try {
            if (file.size > MAX_FILE_SIZE) {
                throw new Error(
                    "El archivo supera el límite de 1 MB."
                );
            }

            const content = await file.text();
            const project = JSON.parse(content);

            validateProject(project);

            const summary =
                `Proyecto válido:\n\n` +
                `${project.vlans.length} VLAN\n` +
                `${project.interfaces.length} interfaces\n` +
                `Fabricante: ${project.switch.vendor}\n\n` +
                `Se sustituirá el diseño actual del navegador.\n` +
                `¿Deseas continuar?`;

            if (!confirm(summary)) {
                showMessage("Importación cancelada.");
                return;
            }

            replaceProject(project);

            // Recargar para inicializar los gestores
            // con los nuevos datos.
            location.reload();

        } catch (error) {
            showMessage(
                `No se pudo importar: ${error.message}`
            );
        } finally {
            fileInput.value = "";
        }
    });

    vendorInput.addEventListener("change", saveMetadata);
    hostnameInput.addEventListener("change", saveMetadata);

    restoreMetadata();
})();
