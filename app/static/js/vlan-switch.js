
(() => {
    "use strict";

    const KEYS = {
        vlans: "walex_vlan_designer_v1",
        interfaces: "walex_vlan_interfaces_v1",
        mappings: "walex_vlan_vendor_ports_v1"
    };

    const vendorLabels = {
        cisco: "Cisco IOS / IOS XE",
        huawei: "Huawei VRP",
        aruba: "Aruba AOS-CX",
        fortiswitch: "FortiSwitchOS Standalone"
    };

    const vendorPatterns = {
        cisco: /^[A-Za-z][A-Za-z0-9/._:-]{0,63}$/,
        huawei: /^(?:GigabitEthernet|XGigabitEthernet|10GE|25GE|40GE|100GE|Eth-Trunk)\d+(?:\/\d+)*$/i,
        aruba: /^(?:\d+\/\d+\/\d+(?::\d+)?|lag\d+)$/i,
        fortiswitch: /^port\d+$/i
    };

    const portsContainer =
        document.getElementById("switch-visual-ports");

    const detailContainer =
        document.getElementById("switch-port-detail");

    const vendorInput =
        document.getElementById("config-vendor");

    const hostnameInput =
        document.getElementById("config-hostname");

    const mappingContainer =
        document.getElementById("config-interface-mapping");

    const interfaceTable =
        document.getElementById("interface-table-body");

    let selectedInterface = null;

    function readStorage(key, fallback) {
        try {
            const value = JSON.parse(
                localStorage.getItem(key) || "null"
            );

            return value ?? fallback;
        } catch {
            return fallback;
        }
    }

    function getProjectData() {
        const vlans = readStorage(KEYS.vlans, []);
        const interfaces = readStorage(KEYS.interfaces, []);
        const mappings = readStorage(KEYS.mappings, {});

        return {
            vlans: Array.isArray(vlans) ? vlans : [],
            interfaces: Array.isArray(interfaces)
                ? interfaces
                : [],
            mappings: mappings &&
                typeof mappings === "object" &&
                !Array.isArray(mappings)
                    ? mappings
                    : {}
        };
    }

    function physicalPortName(iface, vendor, mappings) {
        const key = `${vendor}:${iface.name}`;

        if (Object.hasOwn(mappings, key)) {
            const value = mappings[key];

            return typeof value === "string" &&
                   vendorPatterns[vendor]?.test(value)
                ? value
                : null;
        }

        if (vendorPatterns[vendor]?.test(iface.name)) {
            return iface.name;
        }

        return null;
    }

    function vlanLabel(id, vlans) {
        const vlan = vlans.find(v => v.id === id);

        return vlan
            ? `${id} - ${vlan.name}`
            : `${id} (no definida)`;
    }

    function createDetailItem(label, value) {
        const wrapper = document.createElement("div");
        wrapper.className = "switch-detail-item";

        const title = document.createElement("strong");
        title.textContent = label;

        const content = document.createElement("span");
        content.textContent = value;

        wrapper.append(title, content);
        return wrapper;
    }

    function showPortDetail(iface, physical, vlans) {
        detailContainer.replaceChildren();
        detailContainer.hidden = false;

        const title = document.createElement("h3");

        title.textContent = physical
            ? `Puerto ${physical}`
            : `Interfaz ${iface.name}`;

        const grid = document.createElement("div");
        grid.className = "switch-detail-grid";

        grid.appendChild(createDetailItem(
            "Interfaz lógica",
            iface.name
        ));

        grid.appendChild(createDetailItem(
            "Interfaz física",
            physical || "Sin correspondencia"
        ));

        grid.appendChild(createDetailItem(
            "Modo",
            iface.mode.toUpperCase()
        ));

        const ids = Array.isArray(iface.vlans)
            ? iface.vlans
            : [];

        grid.appendChild(createDetailItem(
            iface.mode === "access"
                ? "VLAN Access"
                : "VLAN permitidas",
            ids.map(id => vlanLabel(id, vlans)).join(", ") || "—"
        ));

        if (iface.mode === "trunk") {
            grid.appendChild(createDetailItem(
                "VLAN nativa",
                iface.native == null
                    ? "No especificada"
                    : vlanLabel(iface.native, vlans)
            ));
        }

        grid.appendChild(createDetailItem(
            "Descripción",
            iface.description || "Sin descripción"
        ));

        detailContainer.append(title, grid);
    }

    function createPort(iface, physical, vlans) {
        const button = document.createElement("button");
        button.type = "button";

        const mode = iface.mode === "trunk"
            ? "trunk"
            : "access";

        button.className = `switch-port ${mode}`;

        if (!physical) {
            button.classList.add("unmapped");
        }

        if (selectedInterface === iface.name) {
            button.classList.add("selected");
        }

        const icon = document.createElement("i");
        icon.className = "bi bi-ethernet";
        icon.setAttribute("aria-hidden", "true");

        const name = document.createElement("span");
        name.className = "switch-port-name";
        name.textContent = physical || iface.name;

        const vlan = document.createElement("span");
        vlan.className = "switch-port-vlan";

        const ids = Array.isArray(iface.vlans)
            ? iface.vlans
            : [];

        vlan.textContent = mode === "access"
            ? `VLAN ${ids[0] ?? "—"}`
            : `Trunk: ${ids.join(", ") || "—"}`;

        button.append(icon, name, vlan);

        if (physical && physical !== iface.name) {
            const logical = document.createElement("span");
            logical.className = "switch-port-logical";
            logical.textContent = iface.name;
            button.appendChild(logical);
        }

        button.setAttribute(
            "aria-label",
            `${physical || iface.name}, ${mode}, ${vlan.textContent}`
        );

        button.addEventListener("click", () => {
            selectedInterface =
                selectedInterface === iface.name
                    ? null
                    : iface.name;

            renderSwitch();
        });

        return button;
    }

    function renderSwitch() {
        const { vlans, interfaces, mappings } =
            getProjectData();

        const vendor = vendorInput.value;
        const hostname = hostnameInput.value.trim();

        document.getElementById(
            "switch-visual-name"
        ).textContent = hostname || "SWITCH";

        document.getElementById(
            "switch-visual-vendor"
        ).textContent =
            vendorLabels[vendor] || "Fabricante desconocido";

        document.getElementById(
            "switch-visual-count"
        ).textContent = `${interfaces.length} interfaces`;

        document.getElementById(
            "switch-visual-access"
        ).textContent =
            `${interfaces.filter(i => i.mode === "access").length} Access`;

        document.getElementById(
            "switch-visual-trunk"
        ).textContent =
            `${interfaces.filter(i => i.mode === "trunk").length} Trunk`;

        portsContainer.replaceChildren();
        detailContainer.replaceChildren();
        detailContainer.hidden = true;

        if (!interfaces.length) {
            const empty = document.createElement("div");
            empty.className = "switch-visual-empty";

            empty.textContent =
                "Configura interfaces para visualizar el switch.";

            portsContainer.appendChild(empty);
            selectedInterface = null;
            return;
        }

        const sorted = [...interfaces].sort(
            (a, b) => a.name.localeCompare(
                b.name, undefined, { numeric: true }
            )
        );

        let foundSelection = false;

        for (const iface of sorted) {
            const physical = physicalPortName(
                iface, vendor, mappings
            );

            const port = createPort(iface, physical, vlans);
            portsContainer.appendChild(port);

            if (selectedInterface === iface.name) {
                foundSelection = true;
                showPortDetail(iface, physical, vlans);
            }
        }

        if (!foundSelection) {
            selectedInterface = null;
        }
    }

    // Cambios en el fabricante y hostname.
    vendorInput.addEventListener("change", () => {
        selectedInterface = null;
        renderSwitch();
    });

    hostnameInput.addEventListener("input", renderSwitch);

    // El editor guarda las correspondencias al escribir.
    // Actualizamos la vista cuando cambian.
    if (mappingContainer) {
        mappingContainer.addEventListener(
            "input",
            renderSwitch
        );
    }

    // Detectar la actualización de la tabla de interfaces,
    // sin modificar el código existente de vlan-designer.js.
    if (interfaceTable) {
        const observer = new MutationObserver(renderSwitch);

        observer.observe(interfaceTable, {
            childList: true,
            subtree: true,
            characterData: true
        });
    }

    // También escuchar cambios de almacenamiento
    // realizados desde otra pestaña del navegador.
    window.addEventListener("storage", event => {
        if (Object.values(KEYS).includes(event.key)) {
            renderSwitch();
        }
    });

    // Primera representación.
    renderSwitch();
})();
