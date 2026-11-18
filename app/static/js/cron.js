
document.addEventListener("DOMContentLoaded", () => {
  const fields = Array.from(
    document.querySelectorAll(".cron-field")
  );

  const expression = document.getElementById("cron-expression");
  const preset = document.getElementById("cron-preset");
  const description = document.getElementById("cron-description");
  const inputError = document.getElementById("cron-input-error");
  const copyButton = document.getElementById("cron-copy");
  const validateButton = document.getElementById("cron-validate");
  const resultContainer = document.getElementById("cron-result");
  const timezoneSelect = document.getElementById("cron-timezone");

  const validateUrl = validateButton.dataset.validateUrl;
  let requestVersion = 0;

  // Interpretaciones de los horarios habituales.
  const descriptions = {
    "*/5 * * * *": "Cada 5 minutos.",
    "*/15 * * * *": "Cada 15 minutos.",
    "0 * * * *": "Cada hora, en el minuto 0.",
    "0 8 * * *": "Todos los días a las 08:00.",
    "30 8 * * 1-5": "De lunes a viernes a las 08:30.",
    "0 2 * * 0": "Todos los domingos a las 02:00.",
    "0 0 1 * *": "El primer día de cada mes a las 00:00."
  };

  function normalize(value) {
    return value.trim().replace(/\s+/g, " ");
  }


  // ===== Interpretación de expresiones Cron =====

  const weekDays = [
    "domingo", "lunes", "martes", "miércoles",
    "jueves", "viernes", "sábado", "domingo"
  ];

  const monthNames = [
    "", "enero", "febrero", "marzo", "abril",
    "mayo", "junio", "julio", "agosto",
    "septiembre", "octubre", "noviembre",
    "diciembre"
  ];

  function pad(number) {
    return String(number).padStart(2, "0");
  }

  function describeTime(minute, hour) {
    // Hora y minuto concretos.
    if (/^\d+$/.test(minute) && /^\d+$/.test(hour)) {
      if (+minute > 59 || +hour > 23) return null;
      return `a las ${pad(hour)}:${pad(minute)}`;
    }

    // Cada N minutos, cualquier hora.
    const minuteStep = minute.match(/^\*\/(\d+)$/);

    if (minuteStep && hour === "*") {
      const step = +minuteStep[1];
      if (step < 1 || step > 59) return null;
      return `cada ${step} minuto${step === 1 ? "" : "s"}`;
    }

    // Cada N horas, en un minuto concreto.
    const hourStep = hour.match(/^\*\/(\d+)$/);

    if (hourStep && /^\d+$/.test(minute)) {
      const step = +hourStep[1];
      if (step < 1 || step > 23 || +minute > 59) return null;

      return `cada ${step} hora${step === 1 ? "" : "s"}, ` +
             `en el minuto ${pad(minute)}`;
    }

    // Minuto concreto de todas las horas.
    if (/^\d+$/.test(minute) && hour === "*") {
      if (+minute > 59) return null;
      return `en el minuto ${pad(minute)} de cada hora`;
    }

    // Cada minuto.
    if (minute === "*" && hour === "*") {
      return "cada minuto";
    }

    // Cada N minutos dentro de un rango de horas.
    const hourRange = hour.match(/^(\d+)-(\d+)$/);

    if (minuteStep && hourRange) {
      const step = +minuteStep[1];
      const start = +hourRange[1];
      const end = +hourRange[2];

      if (step < 1 || step > 59 ||
          start > 23 || end > 23 || start > end) {
        return null;
      }

      return `cada ${step} minutos, ` +
             `de ${pad(start)}:00 a ${pad(end)}:59`;
    }

    // Hora concreta, todos los minutos.
    if (minute === "*" && /^\d+$/.test(hour)) {
      if (+hour > 23) return null;
      return `cada minuto durante la hora ${pad(hour)}`;
    }

    return null;
  }

  function describeWeekday(value) {
    if (value === "*") return "";

    if (value === "1-5") {
      return "de lunes a viernes";
    }

    if (value === "0,6" || value === "6,0") {
      return "los sábados y domingos";
    }

    if (/^[0-7]$/.test(value)) {
      return `los ${weekDays[+value]}`;
    }

    const range = value.match(/^([0-7])-([0-7])$/);

    if (range) {
      const start = +range[1];
      const end = +range[2];

      if (start > end) return null;

      return `de ${weekDays[start]} a ${weekDays[end]}`;
    }

    const days = value.split(",");

    if (days.length > 1 &&
        days.every(day => /^[0-7]$/.test(day))) {
      const uniqueDays = [...new Set(
        days.map(day => weekDays[+day])
      )];

      return `los ${uniqueDays.join(", ")}`;
    }

    return null;
  }

  function describeMonth(value) {
    if (value === "*") return "";

    if (/^\d+$/.test(value)) {
      const month = +value;
      if (month < 1 || month > 12) return null;
      return `en ${monthNames[month]}`;
    }

    const range = value.match(/^(\d+)-(\d+)$/);

    if (range) {
      const start = +range[1];
      const end = +range[2];

      if (start < 1 || end > 12 || start > end) {
        return null;
      }

      return `de ${monthNames[start]} a ${monthNames[end]}`;
    }

    return null;
  }

  function describeDay(value) {
    if (value === "*") return "";

    if (/^\d+$/.test(value)) {
      const day = +value;
      if (day < 1 || day > 31) return null;
      return `el día ${day}`;
    }

    const range = value.match(/^(\d+)-(\d+)$/);

    if (range) {
      const start = +range[1];
      const end = +range[2];

      if (start < 1 || end > 31 || start > end) {
        return null;
      }

      return `del día ${start} al ${end}`;
    }

    return null;
  }

  function describe(value) {
    const cron = normalize(value);

    // Mantener las interpretaciones predefinidas.
    if (Object.hasOwn(descriptions, cron)) {
      return descriptions[cron];
    }

    const parts = cron.split(" ");

    if (parts.length !== 5) {
      return "La expresión debe contener cinco campos.";
    }

    const [minute, hour, day, month, weekday] = parts;

    const timeText = describeTime(minute, hour);
    const dayText = describeDay(day);
    const monthText = describeMonth(month);
    const weekText = describeWeekday(weekday);

    // No interpretar construcciones desconocidas.
    if (timeText === null ||
        dayText === null ||
        monthText === null ||
        weekText === null) {
      return "Expresión personalizada. Valida el horario " +
             "para consultar sus próximas ejecuciones.";
    }

    // Si ambos días están restringidos, cron usa OR.
    // Evitamos una descripción ambigua.
    if (day !== "*" && weekday !== "*") {
      return "La tarea se ejecuta cuando coincide el día " +
             "del mes o el día de la semana. Consulta las " +
             "próximas ejecuciones para verificar el horario.";
    }

    const components = [timeText];

    if (dayText) components.push(dayText);
    if (monthText) components.push(monthText);
    if (weekText) components.push(weekText);

    const sentence = components.join(", ");

    return sentence.charAt(0).toUpperCase() +
           sentence.slice(1) + ".";
  }


  function updateDescription() {
    description.textContent = describe(expression.value);
  }

  function updatePreset() {
    const cron = normalize(expression.value);

    const match = Array.from(preset.options).find(
      option => option.value === cron
    );

    preset.value = match ? match.value : "";
  }

  function clearResults() {
    requestVersion++;
    resultContainer.replaceChildren();
  }

  // Generar la expresión desde los cinco campos.
  function updateFromFields() {
    expression.value = fields
      .map(field => field.value.trim())
      .join(" ");

    inputError.textContent = "";
    clearResults();
    updateDescription();
    updatePreset();
  }

  // Actualizar los campos desde la expresión completa.
  function updateFromExpression() {
    const cron = normalize(expression.value);
    const parts = cron ? cron.split(" ") : [];

    clearResults();

    if (parts.length !== 5) {
      inputError.textContent =
        "Introduce exactamente cinco campos cron.";
      description.textContent = "";
      preset.value = "";
      return;
    }

    fields.forEach((field, index) => {
      field.value = parts[index];
    });

    inputError.textContent = "";
    updateDescription();
    updatePreset();
  }

  // Edición de campos individuales.
  fields.forEach(field => {
    field.addEventListener("input", updateFromFields);
  });

  // Edición directa de la expresión.
  expression.addEventListener("input", updateFromExpression);

  // Aplicar un horario predefinido.
  preset.addEventListener("change", () => {
    if (!preset.value) {
      return;
    }

    expression.value = preset.value;
    updateFromExpression();
  });

  timezoneSelect.addEventListener("change", () => {
  clearResults();
  });

  // Copiar expresión.
  copyButton.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(expression.value);

      copyButton.textContent = "Copiado";

      setTimeout(() => {
        copyButton.textContent = "Copiar";
      }, 1500);

    } catch (error) {
      console.error("Error al copiar:", error);
    }
  });

  // Validación mediante Flask.
  validateButton.addEventListener("click", async () => {
    const cron = normalize(expression.value);
    const version = ++requestVersion;

    inputError.textContent = "";
    resultContainer.replaceChildren();

    if (cron.split(" ").length !== 5) {
      inputError.textContent =
        "La expresión debe contener exactamente cinco campos.";
      return;
    }

    validateButton.disabled = true;

    try {
      const response = await fetch(validateUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          expression: cron,
          timezone: timezoneSelect.value
        })
      });

      const data = await response.json();

      // Ignorar respuestas de una expresión que ya cambió.
      if (version !== requestVersion) {
        return;
      }

      const alert = document.createElement("div");

      alert.className = data.valid
        ? "alert alert-success"
        : "alert alert-danger";

      if (!data.valid) {
        alert.textContent =
          data.error || "Expresión no válida.";

        resultContainer.appendChild(alert);
        return;
      }

      alert.textContent = "Expresión Crontab válida.";
      resultContainer.appendChild(alert);

      const heading = document.createElement("h4");
      heading.className = "h6 mt-4";
      heading.textContent = "Próximas cinco ejecuciones";
      resultContainer.appendChild(heading);

      const list = document.createElement("ol");
      list.className = "list-group list-group-numbered";

      data.executions.forEach(execution => {
        const item = document.createElement("li");

        item.className =
          "list-group-item font-monospace";

        item.textContent = execution;
        list.appendChild(item);
      });

      resultContainer.appendChild(list);

      const timezone = document.createElement("p");
      timezone.className = "small text-muted mt-2";
      timezone.textContent =
        `Zona horaria: ${data.timezone}`;

      resultContainer.appendChild(timezone);

    } catch (error) {
      if (version !== requestVersion) {
        return;
      }

      const alert = document.createElement("div");
      alert.className = "alert alert-danger";
      alert.textContent =
        "No se ha podido conectar con el validador.";

      resultContainer.replaceChildren(alert);
      console.error(error);

    } finally {
      validateButton.disabled = false;
    }
  });


  // ===== Cargar ejemplos prácticos =====

  const exampleButtons = document.querySelectorAll(
    ".cron-load-example"
  );

  exampleButtons.forEach(button => {
    button.addEventListener("click", () => {
      const cron = button.dataset.expression;

      if (!cron) return;

      // Cargar el horario.
      expression.value = cron;

      // Actualizar los campos y la interpretación.
      updateFromExpression();

      // Desplazarse hasta el generador.
      document.getElementById("cron-tool")
        .scrollIntoView({
          behavior: "smooth",
          block: "start"
        });

      // Situar el cursor en la expresión.
      expression.focus({
        preventScroll: true
      });
    });
  });


  // Inicialización.
  updateFromExpression();
});
