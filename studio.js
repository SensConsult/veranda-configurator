(() => {
  "use strict";

  const option = (value, label, description = "") => ({ value, label, description });
  const colors = [
    { ...option("antraciet", "Antraciet", "RAL 7016"), sample: "#383e42" },
    { ...option("zwart", "Gitzwart", "RAL 9005"), sample: "#101010" },
    { ...option("grijs", "Metallic grijs", "RAL 9007"), sample: "#878581" }
  ];
  const roofs = [
    option("glas-helder", "Helder glas", "Doorzichtig glas met vrij zicht naar boven."),
    option("glas-opaal", "Opaalglas", "Melkwit glas dat het daglicht verspreidt."),
    option("poly-helder", "Helder polycarbonaat", "Transparante kanaalplaat van kunststof."),
    option("poly-opaal", "Opaal polycarbonaat", "Melkwitte kunststof kanaalplaat.")
  ];
  const open = option("open", "Open");
  const none = option("geen", "Geen");
  const glassWall = option("glas", "Glazen schuifwand");
  const slidingDoor = option("schuifpui", "Aluminium schuifpui");
  const sidewalls = [open, option("aluminium", "Aluminium wand"), glassWall, slidingDoor];
  const wedges = [
    none, option("aluminium", "Aluminium"), option("glas", "Glas"),
    option("poly-helder", "Polycarbonaat helder"), option("poly-opaal", "Polycarbonaat opaal")
  ];
  const wallFields = [
    { key: "left", label: "Linkerwand", options: sidewalls },
    { key: "right", label: "Rechterwand", options: sidewalls },
    { key: "leftWedge", label: "Spie links", options: wedges },
    { key: "rightWedge", label: "Spie rechts", options: wedges },
    { key: "front", label: "Voorzijde", options: [open, glassWall, slidingDoor] }
  ];
  const extras = [
    { key: "shade", label: "Zonwering", options: [none, option("met", "Met zonwering")] },
    { key: "led", label: "Ledverlichting", options: [
      none, option("koud", "Koudwit 1 W"), option("warm", "Warmwit dimbaar 3 W")
    ] }
  ];
  const colorField = { key: "color", label: "Framekleur", options: colors };
  const roofField = { key: "roof", label: "Dakmateriaal", options: roofs };
  const stages = [
    { heading: "Kies de framekleur", intro: "Kies de kleur van de aluminium profielen.", fields: [colorField], view: "overview" },
    { heading: "Kies het dakmateriaal", intro: "Kies het materiaal en de lichtdoorlaatbaarheid van het dak.", fields: [roofField], view: "roof" },
    { heading: "Kies de wanden", intro: "Een spie sluit de driehoek tussen een zijwand en het schuine dak.", fields: wallFields, view: "front" },
    { heading: "Kies de extra’s", intro: "Voeg zonwering of verlichting toe aan je veranda.", fields: extras, view: "shade" },
    { heading: "Kies de afmetingen", intro: "De breedte loopt langs de gevel. De diepte is de afstand vanaf de gevel.", fields: [], view: "overview" },
    { heading: "Jouw veranda", intro: "Je gekozen uitvoering en afmetingen op een rij.", fields: [], view: "overview" }
  ];
  const allFields = [colorField, roofField, ...wallFields, ...extras];
  const widths = [300, 350, 400, 450, 500, 550, 600, 650, 700];
  const depths = [200, 250, 300, 350, 400, 450, 500, 550, 600];

  function defaults() {
    return Object.fromEntries([...allFields.map(field => [field.key, field.options[0].value]), ["width", 500], ["depth", 300]]);
  }
  let config = defaults();
  let step = 1;

  const id = name => document.getElementById(name);
  const content = id("step-content");
  const stepButtons = [...document.querySelectorAll("[data-step]")];
  const next = id("next");
  const back = id("back");

  function selected(field) {
    return field.options.find(choice => choice.value === config[field.key]);
  }
  function depthLimit() {
    return config.roof === "glas-helder" ? 400 : depths[depths.length - 1];
  }
  function effectiveDepth() {
    return Math.min(config.depth, depthLimit());
  }
  function depthNote() {
    if (config.roof !== "glas-helder") return "";
    const adjustment = config.depth > 400 ? ` Je gekozen diepte van ${config.depth} cm wordt met dit dak 400 cm.` : "";
    return `Met helder glas is de maximale diepte 400 cm.${adjustment}`;
  }
  function summary() {
    return [
      ...allFields.map(field => [field.label, selected(field).label]),
      ["Breedte", `${config.width} cm`], ["Diepte", `${effectiveDepth()} cm`]
    ];
  }
  function effectiveConfig() {
    return { ...config, depth: effectiveDepth() };
  }
  function focusCamera(field) {
    const target = field === "width" || field === "depth" ? "overview" : field;
    window.VerandaCamera?.focus(target, effectiveConfig());
  }
  function updatePreview() {
    const current = effectiveConfig();
    window.VerandaPreview.render(id("preview-canvas"), current);
    id("current-size").textContent = `${current.width} × ${current.depth} cm`;
    id("preview-description").textContent = summary().map(([name, value]) => `${name}: ${value}`).join(". ") + ".";
  }
  function cards(field) {
    const rows = field.options.map(choice => {
      const current = config[field.key] === choice.value;
      const sample = field.key === "color"
        ? `<span class="finish-sample" style="--sample-color: ${choice.sample}"></span>`
        : `<span class="roof-sample ${choice.value}"></span>`;
      return `<label class="model-row${current ? " is-selected" : ""}">
        <input class="choice-radio" type="radio" name="${field.key}" value="${choice.value}"${current ? " checked" : ""}>
        <span class="model-art" aria-hidden="true">${sample}</span>
        <span class="choice-copy"><strong>${choice.label}</strong><small>${choice.description}</small></span>
        <span class="check-mark" aria-hidden="true"></span>
      </label>`;
    }).join("");
    return `<div class="model-list" role="radiogroup" aria-labelledby="step-title">${rows}</div>`;
  }
  function dropdown(name, label, options, value) {
    const items = options.map(choice =>
      `<option value="${choice.value}"${choice.value === value ? " selected" : ""}>${choice.label}</option>`
    ).join("");
    return `<label class="dimension-field"><span>${label}</span><select name="${name}">${items}</select></label>`;
  }
  function sizeDropdown(name, label, values, value) {
    return dropdown(name, label, values.map(v => ({ value: v, label: `${v} cm` })), value);
  }
  function selectionFields() {
    if (step <= 2) {
      const field = stages[step - 1].fields[0];
      return cards(field) + (step === 2 ? `<p class="size-note" id="depth-note">${depthNote()}</p>` : "");
    }
    if (step <= 4) {
      const fields = stages[step - 1].fields.map(field => dropdown(field.key, field.label, field.options, config[field.key]));
      return `<div class="dimensions-grid">${fields.join("")}</div>`;
    }
    if (step === 5) {
      return `<div class="dimensions-grid">
        ${sizeDropdown("width", "Breedte", widths, config.width)}
        ${sizeDropdown("depth", "Diepte", depths.filter(value => value <= depthLimit()), effectiveDepth())}
      </div><p class="size-note" id="depth-note">${depthNote()}</p>`;
    }
    return `<dl class="summary-list">${summary().map(([name, value]) => `<div><dt>${name}</dt><dd>${value}</dd></div>`).join("")}</dl>`;
  }
  function renderStep(focusHeading = false) {
    const stage = stages[step - 1];
    content.innerHTML = `<h2 tabindex="-1" id="step-title">${stage.heading}</h2><p class="section-intro">${stage.intro}</p>${selectionFields()}`;
    for (const button of stepButtons) {
      const number = Number(button.dataset.step);
      button.classList.toggle("is-active", number === step);
      button.classList.toggle("is-complete", number < step);
      if (number === step) button.setAttribute("aria-current", "step");
      else button.removeAttribute("aria-current");
    }
    id("step-counter").textContent = step === 6 ? "Overzicht" : `Stap ${step} van 5`;
    back.hidden = step === 1;
    (next.querySelector("[data-label], .button-label") || next).textContent =
      step === 6 ? "Opnieuw beginnen" : step === 5 ? "Bekijk overzicht" : "Volgende";
    if (focusHeading) content.querySelector("h2").focus();
    focusCamera(stage.view);
  }
  function goToStep(number) {
    if (number < 1 || number > stages.length || number === step) return;
    step = number;
    renderStep(true);
  }

  content.addEventListener("focusin", event => {
    if (event.target.name) focusCamera(event.target.name);
  });
  content.addEventListener("change", event => {
    const input = event.target;
    if (input.name === "width" || input.name === "depth") {
      config[input.name] = Number(input.value);
    } else {
      const field = allFields.find(item => item.key === input.name);
      if (!field) return;
      config[field.key] = input.value;
      if (input.type === "radio") {
        content.querySelectorAll(".model-row").forEach(row =>
          row.classList.toggle("is-selected", row.querySelector("input").checked)
        );
      }
    }
    const note = id("depth-note");
    if (note) note.textContent = depthNote();
    updatePreview();
    focusCamera(input.name);
  });
  stepButtons.forEach(button => button.addEventListener("click", () => goToStep(Number(button.dataset.step))));
  back.addEventListener("click", () => goToStep(step - 1));
  next.addEventListener("click", () => {
    if (step === stages.length) {
      config = defaults();
      updatePreview();
      goToStep(1);
    } else {
      goToStep(step + 1);
    }
  });

  updatePreview();
  renderStep();
})();
