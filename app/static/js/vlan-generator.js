
(() => {
    "use strict";

    const VLAN_KEY = "walex_vlan_designer_v1";
    const INTERFACE_KEY = "walex_vlan_interfaces_v1";

    const output = document.getElementById("config-output");
    const message = document.getElementById("config-message");
    const hostnameInput = document.getElementById("config-hostname");
    const vendorInput = document.getElementById("config-vendor");
    const generateButton = document.getElementById("config-generate");
    const copyButton = document.getElementById("config-copy");
    const downloadButton = document.getElementById("config-download");

    let generatedConfig = "";

    const MAPPING_KEY = "walex_vlan_vendor_ports_v1";
    const mappingContainer = document.getElementById("config-interface-mapping");

    const portPatterns = {
        cisco: /^[A-Za-z][A-Za-z0-9/._:-]{0,63}$/,
        huawei: /^(?:GigabitEthernet|XGigabitEthernet|10GE|25GE|40GE|100GE|Eth-Trunk)\d+(?:\/\d+)*$/i,
        aruba: /^(?:\d+\/\d+\/\d+(?::\d+)?|lag\d+)$/i,
        fortiswitch: /^port\d+$/i
    };

    function readStorage(key) {
        const value = JSON.parse(localStorage.getItem(key) || "[]");

        if (!Array.isArray(value)) {
            throw new Error("Los datos guardados no tienen un formato válido.");
        }

        return value;
    }

    function validVlanId(id) {
        return Number.isInteger(id) && id >= 1 && id <= 4094;
    }

    function validate(vlans, interfaces, hostname) {
        if (!vlans.length) {
            throw new Error("Debes crear al menos una VLAN.");
        }

        if (hostname &&
            (!/^[A-Za-z][A-Za-z0-9-]{0,62}$/.test(hostname) ||
             hostname.endsWith("-"))) {
            throw new Error("El hostname debe comenzar por una letra y contener solo letras, números o guiones.");
        }

        const ids = new Set();

        for (const vlan of vlans) {
            if (!validVlanId(vlan.id)) {
                throw new Error("Existe un identificador de VLAN inválido.");
            }

            if (ids.has(vlan.id)) {
                throw new Error(`La VLAN ${vlan.id} está duplicada.`);
            }

            if (typeof vlan.name !== "string" ||
                !/^[A-Za-z0-9_-]{1,32}$/.test(vlan.name)) {
                throw new Error(
                    `El nombre de la VLAN ${vlan.id} debe tener entre 1 y 32 caracteres: letras, números, guiones o guiones bajos.`
                );
            }

            ids.add(vlan.id);
        }

        const interfaceNames = new Set();

        for (const iface of interfaces) {
            if (typeof iface.name !== "string" ||
                !/^[A-Za-z][A-Za-z0-9/._:-]{0,63}$/.test(iface.name)) {
                throw new Error("Existe un nombre de interfaz inválido.");
            }

            const key = iface.name.toLowerCase();

            if (interfaceNames.has(key)) {
                throw new Error(`La interfaz ${iface.name} está duplicada.`);
            }

            interfaceNames.add(key);

            if (!["access", "trunk"].includes(iface.mode)) {
                throw new Error(`Modo inválido en ${iface.name}.`);
            }

            if (!Array.isArray(iface.vlans) ||
                !iface.vlans.length ||
                iface.vlans.some(id => !validVlanId(id) || !ids.has(id))) {
                throw new Error(
                    `La interfaz ${iface.name} utiliza VLAN no definidas.`
                );
            }

            if (iface.mode === "access" && iface.vlans.length !== 1) {
                throw new Error(
                    `La interfaz ${iface.name} debe tener una única VLAN Access.`
                );
            }

            if (iface.mode === "trunk" &&
                iface.native !== null &&
                iface.native !== undefined &&
                (!validVlanId(iface.native) || !ids.has(iface.native))) {
                throw new Error(
                    `La VLAN nativa de ${iface.name} no está definida.`
                );
            }

            if (typeof iface.description !== "string" ||
                /[\r\n]/.test(iface.description)) {
                throw new Error(
                    `La descripción de ${iface.name} contiene caracteres no permitidos.`
                );
            }
        }
    }

    function generateCisco(vlans, interfaces, hostname) {
        const lines = [];

        lines.push("configure terminal");
        lines.push("!");

        if (hostname) {
            lines.push(`hostname ${hostname}`);
            lines.push("!");
        }

        lines.push("! Definición de VLAN");

        const sortedVlans = [...vlans].sort((a, b) => a.id - b.id);

        for (const vlan of sortedVlans) {
            // VLAN 1 existe por defecto en Cisco IOS.
            if (vlan.id === 1) {
                continue;
            }

            lines.push(`vlan ${vlan.id}`);
            lines.push(` name ${vlan.name}`);
            lines.push("exit");
            lines.push("!");
        }

        lines.push("! Configuración de interfaces");

        const sortedInterfaces = [...interfaces].sort(
            (a, b) => a.name.localeCompare(
                b.name, undefined, { numeric: true }
            )
        );

        for (const iface of sortedInterfaces) {
            lines.push(`interface ${iface.name}`);

            if (iface.description.trim()) {
                lines.push(` description ${iface.description.trim()}`);
            }

            if (iface.mode === "access") {
                lines.push(" switchport mode access");
                lines.push(` switchport access vlan ${iface.vlans[0]}`);
            } else {
                lines.push(" switchport mode trunk");

                const allowed = [...new Set(iface.vlans)]
                    .sort((a, b) => a - b)
                    .join(",");

                lines.push(` switchport trunk allowed vlan ${allowed}`);

                if (iface.native !== null && iface.native !== undefined) {
                    lines.push(` switchport trunk native vlan ${iface.native}`);
                }
            }

            lines.push("exit");
            lines.push("!");
        }

        lines.push("end");

        return lines.join("\n") + "\n";
    }


    /* ============================================
       GENERADORES MULTIVENDOR
       ============================================ */

    function sortedVlans(vlans) {
        return [...vlans].sort((a, b) => a.id - b.id);
    }

    function sortedInterfaces(interfaces) {
        return [...interfaces].sort((a, b) =>
            a.name.localeCompare(b.name, undefined, { numeric: true })
        );
    }

    function allowedVlans(iface) {
        return [...new Set(iface.vlans)]
            .sort((a, b) => a - b);
    }

    function safeDescription(value) {
        const text = value.trim();

        if (/[\r\n\x00-\x1f\x7f"]/.test(text)) {
            throw new Error(
                "Las descripciones no pueden contener comillas dobles " +
                "ni caracteres de control."
            );
        }

        return text;
    }

    function validateVendor(vendor, vlans, interfaces) {
        const validNames = {
            cisco: /^[A-Za-z][A-Za-z0-9/._:-]{0,63}$/,
            huawei: /^(?:GigabitEthernet|XGigabitEthernet|10GE|25GE|40GE|100GE|Eth-Trunk)\d+(?:\/\d+)*$/i,
            aruba: /^(?:\d+\/\d+\/\d+(?::\d+)?|lag\d+)$/i,
            fortiswitch: /^port\d+$/i
        };

        if (!validNames[vendor]) {
            throw new Error("Fabricante no reconocido.");
        }

        for (const iface of interfaces) {
            if (!validNames[vendor].test(iface.name)) {
                throw new Error(
                    `La interfaz ${iface.name} no tiene un formato ` +
                    `reconocido para ${vendor}. ` +
                    "Revisa el nombre físico del puerto."
                );
            }

            safeDescription(iface.description);

            if (vendor === "fortiswitch" &&
                iface.mode === "trunk" &&
                iface.native === null) {
                throw new Error(
                    `La interfaz ${iface.name} necesita una VLAN ` +
                    "nativa explícita para generar FortiSwitchOS."
                );
            }

            if ((vendor === "huawei" || vendor === "aruba") &&
                iface.mode === "trunk" &&
                iface.native !== null &&
                !iface.vlans.includes(iface.native)) {
                throw new Error(
                    `La VLAN nativa ${iface.native} de ${iface.name} ` +
                    "debe figurar también en las VLAN permitidas."
                );
            }
        }

        for (const vlan of vlans) {
            if (
                vendor === "cisco" &&
                vlan.id >= 1002 &&
                vlan.id <= 1005
            ) {
                throw new Error(
                    `La VLAN ${vlan.id} está reservada en Cisco IOS.`
                );
            }

            if (vendor === "fortiswitch") {
                safeDescription(vlan.name);
            }
        }
    }

    /* Huawei VRP */

    function generateHuawei(vlans, interfaces, hostname) {
        const lines = [];

        lines.push("system-view");
        lines.push("#");

        if (hostname) {
            lines.push(`sysname ${hostname}`);
            lines.push("#");
        }

        for (const vlan of sortedVlans(vlans)) {
            if (vlan.id === 1) continue;

            lines.push(`vlan ${vlan.id}`);
            lines.push(` name ${vlan.name}`);
            lines.push("quit");
            lines.push("#");
        }

        for (const iface of sortedInterfaces(interfaces)) {
            lines.push(`interface ${iface.name}`);

            const description = safeDescription(iface.description);

            if (description) {
                lines.push(` description ${description}`);
            }

            if (iface.mode === "access") {
                lines.push(" port link-type access");
                lines.push(` port default vlan ${iface.vlans[0]}`);
            } else {
                lines.push(" port link-type trunk");

                const ids = allowedVlans(iface);

                lines.push(` port trunk allow-pass vlan ${ids.join(" ")}`);

                if (iface.native !== null) {
                    lines.push(` port trunk pvid vlan ${iface.native}`);
                }
            }

            lines.push("quit");
            lines.push("#");
        }

        lines.push("return");

        return lines.join("\n") + "\n";
    }

    /* Aruba AOS-CX */

    function generateAruba(vlans, interfaces, hostname) {
        const lines = [];

        lines.push("configure terminal");
        lines.push("!");

        if (hostname) {
            lines.push(`hostname ${hostname}`);
            lines.push("!");
        }

        for (const vlan of sortedVlans(vlans)) {
            if (vlan.id === 1) continue;

            lines.push(`vlan ${vlan.id}`);
            lines.push(` name ${vlan.name}`);
            lines.push("exit");
            lines.push("!");
        }

        for (const iface of sortedInterfaces(interfaces)) {
            const name = /^lag\d+$/i.test(iface.name)
                ? iface.name.replace(/^lag/i, "lag ")
                : iface.name;

            lines.push(`interface ${name}`);

            const description = safeDescription(iface.description);

            if (description) {
                lines.push(` description ${description}`);
            }

            lines.push(" no routing");

            if (iface.mode === "access") {
                lines.push(` vlan access ${iface.vlans[0]}`);
            } else {
                if (iface.native !== null) {
                    lines.push(` vlan trunk native ${iface.native}`);
                } else {
                    lines.push(" vlan trunk native 1 tag");
                }

                lines.push(
                    ` vlan trunk allowed ${allowedVlans(iface).join(",")}`
                );
            }

            lines.push("exit");
            lines.push("!");
        }

        lines.push("end");

        return lines.join("\n") + "\n";
    }

    /* Fortinet FortiSwitchOS - Standalone */

    function generateFortiSwitch(vlans, interfaces) {
        const lines = [];

        lines.push("# FortiSwitchOS - Standalone");
        lines.push("# Configuración de VLAN");
        lines.push("config switch vlan");

        for (const vlan of sortedVlans(vlans)) {
            if (vlan.id === 1) continue;

            lines.push(`    edit ${vlan.id}`);
            lines.push(
                `        set description "${safeDescription(vlan.name)}"`
            );
            lines.push("    next");
        }

        lines.push("end");
        lines.push("");
        lines.push("# Configuración de interfaces");
        lines.push("config switch interface");

        for (const iface of sortedInterfaces(interfaces)) {
            const description = safeDescription(iface.description);

            lines.push(`    edit "${iface.name}"`);

            if (description) {
                lines.push(`        set description "${description}"`);
            }

            if (iface.mode === "access") {
                lines.push(
                    `        set native-vlan ${iface.vlans[0]}`
                );
                lines.push("        unset allowed-vlans");
            } else {
                lines.push(
                    `        set native-vlan ${iface.native}`
                );

                const tagged = allowedVlans(iface).filter(
                    id => id !== iface.native
                );

                if (tagged.length) {
                    lines.push(
                        `        set allowed-vlans ${tagged.join(" ")}`
                    );
                } else {
                    lines.push("        unset allowed-vlans");
                }
            }

            lines.push("    next");
        }

        lines.push("end");

        return lines.join("\n") + "\n";
    }


    function setMessage(text, type = "error") {
        message.textContent = text;
        message.className = text ? `vlan-message ${type}` : "";
    }


/* Correspondencias de interfaces por fabricante */

function loadMappings() {
    try {
        const data = JSON.parse(
            localStorage.getItem(MAPPING_KEY) || "{}"
        );

        return data && typeof data === "object" &&
               !Array.isArray(data) ? data : {};
    } catch {
        return {};
    }
}

function saveMappings(data) {
    try {
        localStorage.setItem(MAPPING_KEY, JSON.stringify(data));
    } catch {
        setMessage(
            "No se han podido guardar las correspondencias."
        );
    }
}

function defaultPortName(name, vendor) {
    const pattern = portPatterns[vendor];

    return pattern && pattern.test(name) ? name : "";
}

function renderPortMappings() {
    mappingContainer.replaceChildren();

    let interfaces;

    try {
        interfaces = readStorage(INTERFACE_KEY);
    } catch (error) {
        setMessage(error.message);
        return;
    }

    const vendor = vendorInput.value;
    const mappings = loadMappings();

    if (!interfaces.length) {
        const p = document.createElement("p");
        p.textContent = "Todavía no hay interfaces configuradas.";
        mappingContainer.appendChild(p);
        return;
    }

    for (const iface of interfaces) {
        const row = document.createElement("div");
        row.className = "vlan-mapping-row";

        const label = document.createElement("label");
        const input = document.createElement("input");

        input.type = "text";
        input.maxLength = 64;

        const key = `${vendor}:${iface.name}`;
        input.id = `port-map-${vendor}-${interfaces.indexOf(iface)}`;

        label.htmlFor = input.id;
        label.textContent = iface.name;

        input.value = Object.hasOwn(mappings, key)
            ? mappings[key]
            : defaultPortName(iface.name, vendor);

        input.placeholder = {
            cisco: "GigabitEthernet1/0/1",
            huawei: "GigabitEthernet0/0/1",
            aruba: "1/1/1",
            fortiswitch: "port1"
        }[vendor] || "Nombre de interfaz";

        input.addEventListener("input", () => {
            const updated = loadMappings();
            updated[key] = input.value.trim();
            saveMappings(updated);
            invalidate();
        });

        row.append(label, input);
        mappingContainer.appendChild(row);
    }
}

    function resolvePortMappings(interfaces, vendor) {
        const mappings = loadMappings();

        const resolved = interfaces.map(iface => {
            const key = `${vendor}:${iface.name}`;

            const portName = Object.hasOwn(mappings, key)
                ? mappings[key]
                : defaultPortName(iface.name, vendor);

            if (!portName || !portName.trim()) {
                throw new Error(
                    `Asigna un nombre físico para ${iface.name} ` +
                    `en el fabricante seleccionado.`
                );
            }

            return {
                ...iface,
                name: portName.trim()
            };
        });

        const names = new Set();

        for (const iface of resolved) {
            const name = iface.name.toLowerCase();

            if (names.has(name)) {
                throw new Error(
                    `La interfaz física ${iface.name} está asignada ` +
                    "a más de una interfaz del diseño."
                );
            }

            names.add(name);
        }

        return resolved;
    }


    function generate() {
        generatedConfig = "";
        copyButton.disabled = true;
        downloadButton.disabled = true;
        output.textContent = "";

        try {
            const vlans = readStorage(VLAN_KEY);
            const interfaces = readStorage(INTERFACE_KEY);
            const hostname = hostnameInput.value.trim();

            validate(vlans, interfaces, hostname);

            const vendor = vendorInput.value;
            const vendorInterfaces = resolvePortMappings(
                interfaces, vendor
            );

            validateVendor(vendor, vlans, vendorInterfaces);


            switch (vendor) {
                case "cisco":
                    generatedConfig = generateCisco(
                        vlans, vendorInterfaces, hostname
                    );
                    break;

                case "huawei":
                    generatedConfig = generateHuawei(
                        vlans, vendorInterfaces, hostname
                    );
                    break;

                case "aruba":
                    generatedConfig = generateAruba(
                        vlans, vendorInterfaces, hostname
                    );
                    break;

                case "fortiswitch":
                    generatedConfig = generateFortiSwitch(
                        vlans, vendorInterfaces
                    );
                    break;

                default:
                    throw new Error("Fabricante no reconocido.");
            }

            output.textContent = generatedConfig;
            copyButton.disabled = false;
            downloadButton.disabled = false;

            const warnings = [];

            if (vendor === "huawei") {
                warnings.push(
                    "Huawei VRP: revisa las VLAN permitidas por defecto, " +
                    "especialmente VLAN 1, antes de aplicar la configuración."
                );
            }

            if (vendor === "fortiswitch") {
                warnings.push(
                    "FortiSwitchOS Standalone: comprueba el modelo, firmware " +
                    "y configuración existente de los puertos. " +
                    "No se incluyen comandos FortiLink."
                );
            }

            if (
                vendor === "cisco" &&
                vlans.some(v => v.id >= 1006)
            ) {
                warnings.push(
                    "Cisco IOS: el diseño contiene VLAN de rango extendido " +
                    "(1006-4094). Comprueba su compatibilidad con el modelo, " +
                    "la versión de IOS y la configuración VTP."
                );
            }

            if (interfaces.some(i =>
                i.mode === "trunk" &&
                i.native !== null &&
                i.native !== undefined &&
                !i.vlans.includes(i.native)
            )) {
                warnings.push(
                    "Hay interfaces Trunk cuya VLAN nativa no figura entre las VLAN permitidas. Revisa si es intencionado."
                );
            }

            setMessage(
                warnings.length
                    ? warnings.join(" ")
                    : "Configuración generada correctamente.",
                warnings.length ? "warning" : "success"
            );

        } catch (error) {
            output.textContent = "No se pudo generar la configuración.";
            setMessage(error.message);
        }
    }

    generateButton.addEventListener("click", generate);

    copyButton.addEventListener("click", async () => {
        if (!generatedConfig) return;

        try {
            await navigator.clipboard.writeText(generatedConfig);
            setMessage("Configuración copiada al portapapeles.", "success");
        } catch {
            setMessage("No se pudo copiar. Selecciona el texto manualmente.");
        }
    });

    downloadButton.addEventListener("click", () => {
        if (!generatedConfig) return;

        const blob = new Blob(
            [generatedConfig],
            { type: "text/plain;charset=utf-8" }
        );

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        const hostname = hostnameInput.value.trim() || "switch";

        link.href = url;
        const vendor = vendorInput.value;
        link.download = `${hostname}-${vendor}.txt`;

        document.body.appendChild(link);
        link.click();
        link.remove();

        URL.revokeObjectURL(url);
    });

    // Invalidar la salida cuando se cambie de fabricante o hostname.
    function invalidate() {
        generatedConfig = "";
        copyButton.disabled = true;
        downloadButton.disabled = true;
        output.textContent = "Pulsa Generar configuración para actualizar.";
        setMessage("");
    }

    hostnameInput.addEventListener("input", invalidate);

    vendorInput.addEventListener("change", () => {
        invalidate();
        renderPortMappings();
    });

    generateButton.addEventListener("click", renderPortMappings);

    // Mostrar las correspondencias al cargar la página.
    renderPortMappings();

})();