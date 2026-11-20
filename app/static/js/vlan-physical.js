
(() => {
    "use strict";

    const KEYS = {
        vlans: "walex_vlan_designer_v1",
        interfaces: "walex_vlan_interfaces_v1",
        mappings: "walex_vlan_vendor_ports_v1",
        portCount: "walex_vlan_physical_port_count_v1"
    };

    const labels = {
        cisco: "Cisco IOS / IOS XE",
        huawei: "Huawei VRP",
        aruba: "Aruba AOS-CX",
        fortiswitch: "FortiSwitchOS Standalone"
    };

    const patterns = {
        cisco: /^[A-Za-z][A-Za-z0-9/._:-]{0,63}$/,
        huawei: /^(?:GigabitEthernet|XGigabitEthernet|10GE|25GE|40GE|100GE|Eth-Trunk)\d+(?:\/\d+)*$/i,
        aruba: /^(?:\d+\/\d+\/\d+(?::\d+)?|lag\d+)$/i,
        fortiswitch: /^port\d+$/i
    };

    const countInput =
        document.getElementById("physical-port-count");

    const portGrid =
        document.getElementById("physical-port-grid");

    const summary =
        document.getElementById("physical-summary");

    const detail =
        document.getElementById("physical-detail");

    const warnings =
        document.getElementById("physical-warnings");

    const vendorInput =
        document.getElementById("config-vendor");

    const hostnameInput =
        document.getElementById("config-hostname");

    let selectedPort = null;

    function readJSON(key, fallback) {
        try {
            const raw = localStorage.getItem(key);
            return raw === null ? fallback : JSON.parse(raw);
        } catch {
            return fallback;
        }
    }

    function readProject() {
        const vlans = readJSON(KEYS.vlans, []);
        const interfaces = readJSON(KEYS.interfaces, []);
        const mappings = readJSON(KEYS.mappings, {});

        return {
            vlans: Array.isArray(vlans) ? vlans : [],
            interfaces: Array.isArray(interfaces)
                ? interfaces : [],
            mappings: mappings &&
                typeof mappings === "object" &&
                !Array.isArray(mappings)
                    ? mappings : {}
        };
    }

    function physicalName(iface, vendor, mappings) {
        const key = `${vendor}:${iface.name}`;

        if (Object.hasOwn(mappings, key)) {
            const value = mappings[key];

            return typeof value === "string" &&
                patterns[vendor]?.test(value)
                    ? value : null;
        }

        return patterns[vendor]?.test(iface.name)
            ? iface.name : null;
    }

    function portNumber(name, vendor) {
        if (!name) return null;

        let match = null;

        if (vendor === "fortiswitch") {
            match = /^port(\d+)$/i.exec(name);
        } else if (vendor === "aruba") {
            match = /^\d+\/\d+\/(\d+)$/.exec(name);
        } else if (vendor === "huawei") {
            // No representar Eth-Trunk como puerto físico.
            if (/^Eth-Trunk/i.test(name)) return null;
            match = /\/(\d+)$/.exec(name);
        } else if (vendor === "cisco") {
            // La vista representa puertos físicos,
            // no Port-channel ni subinterfaces.
            if (/^(?:Po|Port-channel)/i.test(name)) return null;
            match = /\/(\d+)$/.exec(name);
        }

        if (!match) return null;

        const number = Number(match[1]);

        return Number.isSafeInteger(number) && number > 0
            ? number : null;
    }

    function buildAssignments(interfaces, mappings, vendor, count) {
        const candidates = new Map();
        const issues = [];

        for (const iface of interfaces) {
            const physical = physicalName(iface, vendor, mappings);

            if (!physical) {
                issues.push(
                    `${iface.name}: sin correspondencia física válida.`
                );
                continue;
            }

            const number = portNumber(physical, vendor);

            if (number === null) {
                issues.push(
                    `${physical}: no se puede determinar una posición física.`
                );
                continue;
            }

            if (number > count) {
                issues.push(
                    `${physical}: puerto ${number} fuera del modelo de ${count} puertos.`
                );
                continue;
            }

            if (!candidates.has(number)) {
                candidates.set(number, []);
            }

            candidates.get(number).push({ iface, physical });
        }

        const assigned = new Map();

        for (const [number, items] of candidates) {
            if (items.length === 1) {
                assigned.set(number, items[0]);
            } else {
                issues.push(
                    `Posición ${number}: asignaciones ambiguas (${items.map(
                        item => item.physical
                    ).join(", ")}).`
                );
            }
        }

        return { assigned, issues };
    }

    function addText(parent, tag, value, className = "") {
        const element = document.createElement(tag);
        element.textContent = value;

        if (className) element.className = className;

        parent.appendChild(element);
        return element;
    }

    function showDetail(number, assignment, vlans) {
        detail.replaceChildren();
        detail.hidden = false;

        addText(detail, "h3", `Puerto ${number}`);

        if (!assignment) {
            addText(
                detail, "p",
                "Puerto libre en el diseño actual."
            );
            return;
        }

        const { iface, physical } = assignment;

        addText(detail, "p", `Interfaz física: ${physical}`);
        addText(detail, "p", `Interfaz lógica: ${iface.name}`);
        addText(detail, "p", `Modo: ${iface.mode.toUpperCase()}`);

        const vlanNames = iface.vlans.map(id => {
            const vlan = vlans.find(v => v.id === id);

            return vlan
                ? `${id} (${vlan.name})`
                : `${id} (no definida)`;
        });

        addText(
            detail,
            "p",
            `VLAN: ${vlanNames.join(", ")}`
        );

        if (iface.mode === "trunk") {
            addText(
                detail,
                "p",
                `VLAN nativa: ${iface.native ?? "No especificada"}`
            );
        }

        addText(
            detail,
            "p",
            `Descripción: ${iface.description || "Sin descripción"}`
        );
    }

    function makePort(number, assignment) {
        const button = document.createElement("button");
        button.type = "button";

        const mode = assignment?.iface.mode;

        button.className = "physical-port";

        if (mode === "access" || mode === "trunk") {
            button.classList.add(mode);
        }

        if (selectedPort === number) {
            button.classList.add("selected");
        }

        const icon = document.createElement("i");
        icon.className = "bi bi-ethernet";
        icon.setAttribute("aria-hidden", "true");

        button.appendChild(icon);
        addText(button, "span", String(number));

        const description = assignment
            ? `${assignment.physical}, ${mode}, VLAN ${assignment.iface.vlans.join(", ")}`
            : `Puerto ${number}, libre`;

        button.title = description;
        button.setAttribute("aria-label", description);

        button.addEventListener("click", () => {
            selectedPort = number;
            renderPhysical();
        });

        return button;
    }

    function renderPhysical() {
        const count = Number(countInput.value);
        const vendor = vendorInput.value;
        const { vlans, interfaces, mappings } = readProject();

        document.getElementById(
            "physical-hostname"
        ).textContent = hostnameInput.value.trim() || "SWITCH";

        document.getElementById(
            "physical-vendor"
        ).textContent =
            `${labels[vendor] || vendor} · ${count} puertos`;

        const { assigned, issues } = buildAssignments(
            interfaces, mappings, vendor, count
        );

        portGrid.replaceChildren();

        portGrid.style.setProperty(
            "--physical-columns", String(count / 2)
        );

        // Fila superior: puertos impares.
        // Fila inferior: puertos pares.
        for (const start of [1, 2]) {
            const row = document.createElement("div");
            row.className = "physical-port-row";

            for (let number = start; number <= count; number += 2) {
                row.appendChild(
                    makePort(number, assigned.get(number))
                );
            }

            portGrid.appendChild(row);
        }

        const accessCount = [...assigned.values()]
            .filter(item => item.iface.mode === "access")
            .length;

        const trunkCount = [...assigned.values()]
            .filter(item => item.iface.mode === "trunk")
            .length;

        summary.replaceChildren();

        addText(
            summary, "span",
            `${accessCount} Access`
        );

        addText(
            summary, "span",
            `${trunkCount} Trunk`
        );

        addText(
            summary, "span",
            `${count - assigned.size} sin asignación`
        );

        if (issues.length) {
            addText(
                summary, "span",
                `${issues.length} advertencias`
            );
        }

        warnings.replaceChildren();
        warnings.hidden = issues.length === 0;

        for (const issue of issues) {
            addText(warnings, "p", issue);
        }

        if (selectedPort !== null && selectedPort <= count) {
            showDetail(
                selectedPort,
                assigned.get(selectedPort),
                vlans
            );
        } else {
            selectedPort = null;
            detail.replaceChildren();
            detail.hidden = true;
        }
    }

    // Persistir la preferencia de visualización.
    const savedCount = Number(
        readJSON(KEYS.portCount, 24)
    );

    if ([8, 24, 48].includes(savedCount)) {
        countInput.value = String(savedCount);
    }

    countInput.addEventListener("change", () => {
        selectedPort = null;

        try {
            localStorage.setItem(
                KEYS.portCount,
                JSON.stringify(Number(countInput.value))
            );
        } catch {
            // El panel seguirá funcionando sin persistencia.
        }

        renderPhysical();
    });

    vendorInput.addEventListener("change", () => {
        selectedPort = null;
        renderPhysical();
    });

    hostnameInput.addEventListener("input", renderPhysical);

    // Actualizar cuando se editen las correspondencias.
    const mappingContainer =
        document.getElementById("config-interface-mapping");

    if (mappingContainer) {
        mappingContainer.addEventListener(
            "input", renderPhysical
        );
    }

    // Actualizar cuando cambie el inventario de interfaces.
    const interfaceTable =
        document.getElementById("interface-table-body");

    if (interfaceTable) {
        const observer = new MutationObserver(renderPhysical);

        observer.observe(interfaceTable, {
            childList: true,
            subtree: true,
            characterData: true
        });
    }

    // Sincronizar cambios realizados en otras pestañas.
    window.addEventListener("storage", event => {
        if (Object.values(KEYS).includes(event.key)) {
            renderPhysical();
        }
    });

    renderPhysical();
})();
