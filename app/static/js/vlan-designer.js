
(() => {
    "use strict";

    const STORAGE_KEY = "walex_vlan_designer_v1";

    const form = document.getElementById("vlan-form");
    const idInput = document.getElementById("vlan-id");
    const nameInput = document.getElementById("vlan-name");
    const subnetInput = document.getElementById("vlan-subnet");
    const descriptionInput = document.getElementById("vlan-description");

    const tableBody = document.getElementById("vlan-table-body");
    const message = document.getElementById("vlan-message");
    const saveButton = document.getElementById("vlan-save");


    let vlans = [];
    let editingId = null;

    const INTERFACE_STORAGE_KEY = "walex_vlan_interfaces_v1";

    const interfaceForm = document.getElementById("interface-form");
    const interfaceName = document.getElementById("interface-name");
    const interfaceMode = document.getElementById("interface-mode");
    const interfaceAccessVlan = document.getElementById("interface-access-vlan");
    const interfaceTrunkVlans = document.getElementById("interface-trunk-vlans");
    const interfaceNativeVlan = document.getElementById("interface-native-vlan");
    const interfaceDescription = document.getElementById("interface-description");
    const interfaceTableBody = document.getElementById("interface-table-body");
    const interfaceMessage = document.getElementById("interface-message");
    const interfaceSaveButton = document.getElementById("interface-save");

    let interfaces = [];
    let editingInterface = null;


    function showMessage(text, type = "error") {
        message.textContent = text;
        message.className = `vlan-message ${type}`;
    }

    function clearMessage() {
        message.textContent = "";
        message.className = "";
    }

    function validSubnet(value) {
        if (!value) return true;

        const parts = value.split("/");
        if (parts.length !== 2) return false;

        const prefix = Number(parts[1]);

        if (!/^\d+$/.test(parts[1]) ||
            prefix < 0 || prefix > 32) {
            return false;
        }

        const octets = parts[0].split(".");

        if (octets.length !== 4) return false;

        if (!octets.every(o =>
            /^\d{1,3}$/.test(o) &&
            Number(o) >= 0 &&
            Number(o) <= 255
        )) {
            return false;
        }

        // Comprobar que la dirección es la de red.
        const address = octets.reduce(
            (acc, octet) =>
                ((acc << 8) | Number(octet)) >>> 0,
            0
        );

        const mask = prefix === 0
            ? 0
            : (0xFFFFFFFF << (32 - prefix)) >>> 0;

        return (address & mask) >>> 0 === address;
    }

    function loadVlans() {
        try {
            const saved = JSON.parse(
                localStorage.getItem(STORAGE_KEY) || "[]"
            );

            vlans = Array.isArray(saved)
                ? saved.filter(v =>
                    v &&
                    Number.isInteger(v.id) &&
                    v.id >= 1 &&
                    v.id <= 4094 &&
                    typeof v.name === "string" &&
                    typeof v.subnet === "string" &&
                    typeof v.description === "string"
                )
                : [];
        } catch {
            vlans = [];
        }
    }

    function saveVlans() {
        try {
            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(vlans)
            );
        } catch {
            showMessage(
                "No se pueden guardar los datos en este navegador."
            );
        }
    }

    function resetForm() {
        form.reset();
        editingId = null;
        idInput.disabled = false;
        saveButton.innerHTML =
            '<i class="bi bi-plus-lg"></i> Añadir VLAN';
        clearMessage();
    }

    function render() {
        vlans.sort((a, b) => a.id - b.id);
        tableBody.replaceChildren();

        updateVlanSelectors();

        document.getElementById("stat-total").textContent =
            vlans.length;

        document.getElementById("stat-subnets").textContent =
            vlans.filter(v => v.subnet).length;

        if (!vlans.length) {
            const row = document.createElement("tr");
            const cell = document.createElement("td");

            cell.colSpan = 5;
            cell.className = "vlan-empty";
            cell.textContent = "Todavía no hay VLAN configuradas.";

            row.appendChild(cell);
            tableBody.appendChild(row);
            return;
        }

        for (const vlan of vlans) {
            const row = document.createElement("tr");

            const cellId = document.createElement("td");
            const badge = document.createElement("span");
            badge.className = "vlan-id";
            badge.textContent = vlan.id;
            cellId.appendChild(badge);

            const cellName = document.createElement("td");
            cellName.textContent = vlan.name;

            const cellSubnet = document.createElement("td");
            cellSubnet.textContent = vlan.subnet || "—";

            const cellDescription = document.createElement("td");
            cellDescription.textContent = vlan.description || "—";

            const cellActions = document.createElement("td");
            const actions = document.createElement("div");
            actions.className = "vlan-row-actions";

            const editButton = document.createElement("button");
            editButton.type = "button";
            editButton.className = "vlan-icon-btn";
            editButton.title = "Editar VLAN";
            editButton.setAttribute("aria-label", `Editar VLAN ${vlan.id}`);
            editButton.innerHTML = '<i class="bi bi-pencil-square"></i>';
            editButton.addEventListener("click", () => editVlan(vlan.id));

            const deleteButton = document.createElement("button");
            deleteButton.type = "button";
            deleteButton.className = "vlan-icon-btn delete";
            deleteButton.title = "Eliminar VLAN";
            deleteButton.setAttribute("aria-label", `Eliminar VLAN ${vlan.id}`);
            deleteButton.innerHTML = '<i class="bi bi-trash"></i>';
            deleteButton.addEventListener("click", () => deleteVlan(vlan.id));

            actions.append(editButton, deleteButton);
            cellActions.appendChild(actions);

            row.append(
                cellId,
                cellName,
                cellSubnet,
                cellDescription,
                cellActions
            );

            tableBody.appendChild(row);
        }
    }

    function editVlan(id) {
        const vlan = vlans.find(v => v.id === id);
        if (!vlan) return;

        editingId = id;

        idInput.value = vlan.id;
        idInput.disabled = true;
        nameInput.value = vlan.name;
        subnetInput.value = vlan.subnet;
        descriptionInput.value = vlan.description;

        saveButton.innerHTML =
            '<i class="bi bi-check-lg"></i> Guardar cambios';

        clearMessage();
        form.scrollIntoView({ behavior: "smooth", block: "center" });
        nameInput.focus();
    }

    function deleteVlan(id) {
    const vlan = vlans.find(v => v.id === id);
    if (!vlan) return;

    const usedBy = interfaces.filter(iface =>
        iface.vlans.includes(id) || iface.native === id
    );

    if (usedBy.length) {
        showMessage(
            `No puedes eliminar la VLAN ${id}. ` +
            `Está utilizada por: ${usedBy.map(i => i.name).join(", ")}.`
        );
        return;
    }

    if (!confirm(`¿Eliminar la VLAN ${id} (${vlan.name})?`)) {
    return;
    }

    vlans = vlans.filter(v => v.id !== id);

    if (editingId === id) {
        resetForm();
    }

    saveVlans();
    render();
    showMessage(`VLAN ${id} eliminada.`, "success");
    }


/* ============================================
   GESTIÓN DE INTERFACES
   ============================================ */

function loadInterfaces() {
    try {
        const saved = JSON.parse(
            localStorage.getItem(INTERFACE_STORAGE_KEY) || "[]"
        );

        interfaces = Array.isArray(saved)
            ? saved.filter(item =>
                item &&
                typeof item.name === "string" &&
                (item.mode === "access" || item.mode === "trunk") &&
                Array.isArray(item.vlans) &&
                item.vlans.every(Number.isInteger) &&
                (item.native === null || Number.isInteger(item.native)) &&
                typeof item.description === "string"
            )
            : [];
    } catch {
        interfaces = [];
    }
}

function saveInterfaces() {
    try {
        localStorage.setItem(
            INTERFACE_STORAGE_KEY,
            JSON.stringify(interfaces)
        );
    } catch {
        interfaceShowMessage(
            "No se pueden guardar las interfaces en este navegador."
        );
    }
}

function interfaceShowMessage(text, type = "error") {
    interfaceMessage.textContent = text;
    interfaceMessage.className = `vlan-message ${type}`;
}

function clearInterfaceMessage() {
    interfaceMessage.textContent = "";
    interfaceMessage.className = "";
}

function updateInterfaceMode() {
    const trunk = interfaceMode.value === "trunk";

    document.getElementById("access-fields").hidden = trunk;
    document.getElementById("trunk-fields").hidden = !trunk;
    document.getElementById("native-fields").hidden = !trunk;

    interfaceAccessVlan.required = !trunk;
    interfaceTrunkVlans.required = trunk;
}

function updateVlanSelectors() {
    const selectedAccess = interfaceAccessVlan.value;
    const selectedNative = interfaceNativeVlan.value;

    interfaceAccessVlan.replaceChildren();
    interfaceNativeVlan.replaceChildren();

    function addOption(select, value, label) {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = label;
        select.appendChild(option);
    }

    addOption(interfaceAccessVlan, "", "Seleccionar VLAN");
    addOption(interfaceNativeVlan, "", "Sin especificar");

    for (const vlan of vlans) {
        const label = `${vlan.id} - ${vlan.name}`;
        addOption(interfaceAccessVlan, String(vlan.id), label);
        addOption(interfaceNativeVlan, String(vlan.id), label);
    }

    interfaceAccessVlan.value = selectedAccess;
    interfaceNativeVlan.value = selectedNative;
}

function parseVlanList(value) {
    const tokens = value.split(",").map(v => v.trim());

    if (tokens.some(v => !/^\d+$/.test(v))) {
        throw new Error(
            "Introduce VLAN separadas por comas. Ejemplo: 10,20,30."
        );
    }

    const ids = [...new Set(tokens.map(Number))];

    if (ids.some(id => id < 1 || id > 4094)) {
        throw new Error("Los identificadores deben estar entre 1 y 4094.");
    }

    for (const id of ids) {
        if (!vlans.some(v => v.id === id)) {
            throw new Error(`La VLAN ${id} no está definida.`);
        }
    }

    return ids.sort((a, b) => a - b);
}

function resetInterfaceForm() {
    interfaceForm.reset();
    editingInterface = null;
    interfaceName.disabled = false;

    interfaceSaveButton.innerHTML =
        '<i class="bi bi-plus-lg"></i> Añadir interfaz';

    updateInterfaceMode();
    clearInterfaceMessage();
}

function renderInterfaces() {
    interfaceTableBody.replaceChildren();

    document.getElementById("stat-interfaces").textContent =
        interfaces.length;

    if (!interfaces.length) {
        const row = document.createElement("tr");
        const cell = document.createElement("td");

        cell.colSpan = 6;
        cell.className = "vlan-empty";
        cell.textContent = "Todavía no hay interfaces configuradas.";

        row.appendChild(cell);
        interfaceTableBody.appendChild(row);
        return;
    }

    const sorted = [...interfaces].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { numeric: true })
    );

    for (const iface of sorted) {
        const row = document.createElement("tr");

        function cell(value) {
            const td = document.createElement("td");
            td.textContent = value;
            return td;
        }

        const modeCell = document.createElement("td");
        const modeBadge = document.createElement("span");

        modeBadge.className = `interface-mode ${iface.mode}`;
        modeBadge.textContent = iface.mode.toUpperCase();
        modeCell.appendChild(modeBadge);

        const actionCell = document.createElement("td");
        const actions = document.createElement("div");
        actions.className = "vlan-row-actions";

        const editButton = document.createElement("button");
        editButton.type = "button";
        editButton.className = "vlan-icon-btn";
        editButton.title = "Editar interfaz";
        editButton.setAttribute("aria-label", `Editar ${iface.name}`);
        editButton.innerHTML = '<i class="bi bi-pencil-square"></i>';
        editButton.addEventListener(
            "click", () => editInterface(iface.name)
        );

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "vlan-icon-btn delete";
        deleteButton.title = "Eliminar interfaz";
        deleteButton.setAttribute("aria-label", `Eliminar ${iface.name}`);
        deleteButton.innerHTML = '<i class="bi bi-trash"></i>';
        deleteButton.addEventListener(
            "click", () => deleteInterface(iface.name)
        );

        actions.append(editButton, deleteButton);
        actionCell.appendChild(actions);

        row.append(
            cell(iface.name),
            modeCell,
            cell(iface.vlans.join(", ")),
            cell(iface.native ?? "—"),
            cell(iface.description || "—"),
            actionCell
        );

        interfaceTableBody.appendChild(row);
    }
}

function editInterface(name) {
    const iface = interfaces.find(item => item.name === name);
    if (!iface) return;

    editingInterface = name;
    interfaceName.value = iface.name;
    interfaceName.disabled = false;

    interfaceMode.value = iface.mode;
    updateInterfaceMode();

    interfaceAccessVlan.value =
        iface.mode === "access" ? String(iface.vlans[0]) : "";

    interfaceTrunkVlans.value =
        iface.mode === "trunk" ? iface.vlans.join(",") : "";

    interfaceNativeVlan.value =
        iface.native === null ? "" : String(iface.native);

    interfaceDescription.value = iface.description;

    interfaceSaveButton.innerHTML =
        '<i class="bi bi-check-lg"></i> Guardar cambios';

    clearInterfaceMessage();

    interfaceForm.scrollIntoView({
        behavior: "smooth",
        block: "center"
    });
}

function deleteInterface(name) {
    if (!confirm(`¿Eliminar la interfaz ${name}?`)) {
        return;
    }

    interfaces = interfaces.filter(item => item.name !== name);

    if (editingInterface === name) {
        resetInterfaceForm();
    }

    saveInterfaces();
    renderInterfaces();

    interfaceShowMessage(
        `Interfaz ${name} eliminada.`,
        "success"
    );
}

interfaceForm.addEventListener("submit", event => {
    event.preventDefault();

    const name = interfaceName.value.trim();
    const mode = interfaceMode.value;
    const description = interfaceDescription.value.trim();

    if (!/^[A-Za-z][A-Za-z0-9/._:-]{0,63}$/.test(name)) {
        interfaceShowMessage("Introduce un nombre de interfaz válido.");
        return;
    }

    if (interfaces.some(item =>
        item.name.toLowerCase() === name.toLowerCase() &&
        item.name !== editingInterface
    )) {
        interfaceShowMessage(`La interfaz ${name} ya existe.`);
        return;
    }

    let vlanIds = [];
    let native = null;

    try {
        if (mode === "access") {
            vlanIds = parseVlanList(interfaceAccessVlan.value);

            if (vlanIds.length !== 1) {
                throw new Error("Selecciona una única VLAN Access.");
            }
        } else {
            vlanIds = parseVlanList(interfaceTrunkVlans.value);

            if (interfaceNativeVlan.value) {
                native = Number(interfaceNativeVlan.value);

                if (!vlans.some(v => v.id === native)) {
                    throw new Error("La VLAN nativa no está definida.");
                }
            }
        }
    } catch (error) {
        interfaceShowMessage(error.message);
        return;
    }

    const iface = {
        name,
        mode,
        vlans: vlanIds,
        native,
        description
    };

    const wasEditing = editingInterface !== null;

    if (wasEditing) {
        const index = interfaces.findIndex(
            item => item.name === editingInterface
        );

        if (index === -1) {
            interfaceShowMessage("No se encuentra la interfaz.");
            return;
        }

        interfaces[index] = iface;
    } else {
        interfaces.push(iface);
    }

    saveInterfaces();
    renderInterfaces();
    resetInterfaceForm();

    interfaceShowMessage(
        `Interfaz ${name} ${wasEditing ? "actualizada" : "añadida"}.`,
        "success"
    );
});

interfaceMode.addEventListener("change", updateInterfaceMode);

document.getElementById("interface-reset")
    .addEventListener("click", resetInterfaceForm);


    form.addEventListener("submit", event => {
        event.preventDefault();

        const id = Number(idInput.value);
        const name = nameInput.value.trim();
        const subnet = subnetInput.value.trim();
        const description = descriptionInput.value.trim();

        if (!Number.isInteger(id) || id < 1 || id > 4094) {
            showMessage("El VLAN ID debe estar entre 1 y 4094.");
            return;
        }

        if (!name) {
            showMessage("Introduce un nombre para la VLAN.");
            return;
        }

        if (!validSubnet(subnet)) {
            showMessage(
                "La subred debe utilizar notación CIDR y una dirección de red válida. Ejemplo: 192.168.10.0/24."
            );
            return;
        }

        const duplicate = vlans.some(
            v => v.id === id && v.id !== editingId
        );

        if (duplicate) {
            showMessage(`La VLAN ${id} ya está configurada.`);
            return;
        }

        const vlan = { id, name, subnet, description };
        const wasEditing = editingId !== null;

        if (wasEditing) {
            const index = vlans.findIndex(v => v.id === editingId);
            if (index === -1) {
                showMessage("No se encuentra la VLAN que deseas editar.");
                return;
            }
            vlans[index] = vlan;
        } else {
            vlans.push(vlan);
        }

        saveVlans();
        render();
        resetForm();

        showMessage(
            `VLAN ${id} ${wasEditing ? "actualizada" : "añadida"} correctamente.`,
            "success"
        );
    });

    document.getElementById("vlan-reset")
        .addEventListener("click", resetForm);

    loadVlans();
    loadInterfaces();

    render();
    renderInterfaces();
    updateInterfaceMode();
})();
