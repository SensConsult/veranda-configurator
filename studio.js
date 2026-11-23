(() => {
  "use strict";

  const option = (value, label, description = "", tile) => ({ value, label, description, tile });
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
  const open = option("open", "Open", "Vrije doorgang naar de tuin.", 0);
  const none = option("geen", "Geen");
  const glassWall = option("glas", "Glazen schuifwand", "Doorzichtige schuifpanelen.", 2);
  const slidingDoor = option("schuifpui", "Aluminium schuifpui", "Glazen deuren met aluminium omlijsting.", 3);
  const walls = [open, option("aluminium", "Aluminium wand", "Gesloten wand met horizontale panelen.", 1), glassWall, slidingDoor];
  const wedges = [
    none, option("aluminium", "Aluminium", "", 4), option("glas", "Glas", "", 5),
    option("poly-helder", "Polycarbonaat helder", "", 6), option("poly-opaal", "Polycarbonaat opaal", "", 7)
  ];
  const pages = [
    { group: 1, key: "color", label: "Framekleur", title: "Kies de framekleur", intro: "Kies de kleur van de aluminium profielen.", options: colors, view: "overview" },
    { group: 2, key: "roof", label: "Dakmateriaal", title: "Kies het dakmateriaal", intro: "Bekijk hoe het daglicht door de dakplaten valt.", options: roofs, view: "roof" },
    { group: 3, key: "left", label: "Linkerwand", title: "Kies de linkerwand", intro: "Wil je deze zijde openhouden of afsluiten?", options: walls, view: "left" },
    { group: 3, key: "leftWedge", label: "Spie links", title: "Kies de spie links", intro: "De spie vult de driehoek onder het schuine dak.", options: wedges, view: "leftWedge" },
    { group: 3, key: "right", label: "Rechterwand", title: "Kies de rechterwand", intro: "Kies de afwerking aan de andere zijde van het terras.", options: walls, view: "right" },
    { group: 3, key: "rightWedge", label: "Spie rechts", title: "Kies de spie rechts", intro: "Kies hoe je de ruimte boven de rechterwand afwerkt.", options: wedges, view: "rightWedge" },
    { group: 3, key: "front", label: "Voorzijde", title: "Kies de voorzijde", intro: "Bepaal hoe je vanaf de veranda de tuin in loopt.", options: [open, glassWall, slidingDoor], view: "front" },
    { group: 4, key: "shade", label: "Zonwering", title: "Kies de zonwering", intro: "Een doek boven het dak houdt direct zonlicht tegen.", options: [none, option("met", "Met zonwering", "Een doek over de breedte van de veranda.", 8)], view: "shade" },
    { group: 4, key: "led", label: "Ledverlichting", title: "Kies de verlichting", intro: "Bekijk de lichtkleur van de spots onder de dakliggers.", options: [none, option("koud", "Koudwit 1 W", "", 9), option("warm", "Warmwit dimbaar 3 W", "", 10)], view: "lighting" },
    { group: 5, key: "size", title: "Kies de afmetingen", intro: "De breedte loopt langs de gevel. De diepte is de afstand vanaf de gevel.", view: "overview" },
    { group: 6, key: "summary", title: "Jouw veranda", intro: "Je gekozen uitvoering en afmetingen op een rij.", view: "overview" }
  ];
  const fields = pages.filter(page => page.options);
  const widths = [300, 350, 400, 450, 500, 550, 600, 650, 700];
  const depths = [200, 250, 300, 350, 400, 450, 500, 550, 600];
  const views = { overview: "Totaalbeeld vanaf het terras", roof: "Het dak schuin van boven", left: "De linkerzijde", leftWedge: "De driehoek boven de linkerwand", right: "De rechterzijde", rightWedge: "De driehoek boven de rechterwand", shade: "De zonwering boven het dak", front: "De voorzijde vanuit de tuin", lighting: "Onder de voorrand van het dak" };
  const id = name => document.getElementById(name);
  const content = id("step-content");
  const stepButtons = [...document.querySelectorAll("[data-step]")];
  const back = id("back");
  const next = id("next");
  let pageIndex = 0;
  let config = defaults();

  function defaults() {
    return { ...Object.fromEntries(fields.map(field => [field.key, field.options[0].value])), width: 500, depth: 300 };
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
      ...fields.map(field => [field.label, field.options.find(choice => choice.value === config[field.key]).label]),
      ["Breedte", `${config.width} cm`], ["Diepte", `${effectiveDepth()} cm`]
    ];
  }

  function updatePreview() {
    const view = pages[pageIndex].view;
    const current = { ...config, depth: effectiveDepth() };
    window.VerandaPreview.render(id("preview-canvas"), current, view);
    id("current-size").textContent = `${current.width} × ${current.depth} cm`;
    id("preview-description").textContent = views[view] + ". " + summary().map(row => row.join(": ")).join(". ") + ".";
  }

  function sample(field, choice) {
    if (field.key === "color") return `<span class="finish-sample ${choice.value}" style="--sample-color: ${choice.sample}"></span>`;
    if (field.key === "roof") return `<span class="roof-sample ${choice.value}"></span>`;
    if (choice.tile === undefined) return '<span class="empty-sample">–</span>';
    const x = (choice.tile % 4) * 100 / 3;
    const y = Math.floor(choice.tile / 4) * 50;
    return `<span class="part-sample" style="background-position:${x}% ${y}%"></span>`;
  }

  function cards(field) {
    const rows = field.options.map(choice => {
      const current = config[field.key] === choice.value;
      return `<label class="model-row${current ? " is-selected" : ""}">
        <input class="choice-radio" type="radio" name="${field.key}" value="${choice.value}"${current ? " checked" : ""}>
        <span class="model-art" aria-hidden="true">${sample(field, choice)}</span>
        <span class="choice-copy"><strong>${choice.label}</strong>${choice.description ? `<small>${choice.description}</small>` : ""}</span>
        <span class="check-mark" aria-hidden="true"></span>
      </label>`;
    }).join("");
    return `<div class="model-list" role="radiogroup" aria-labelledby="step-title">${rows}</div>`;
  }

  function sizeDropdown(name, label, values, selected) {
    const options = values.map(value => `<option value="${value}"${value === selected ? " selected" : ""}>${value} cm</option>`).join("");
    return `<label class="dimension-field"><span>${label}</span><select name="${name}">${options}</select></label>`;
  }

  function selectionFields(page) {
    const note = '<p class="size-note" id="depth-note">' + depthNote() + '</p>';
    if (page.options) return cards(page) + (page.key === "roof" ? note : "");
    if (page.key === "size") {
      return `<div class="dimensions-grid">
        ${sizeDropdown("width", "Breedte", widths, config.width)}
        ${sizeDropdown("depth", "Diepte", depths.filter(value => value <= depthLimit()), effectiveDepth())}
      </div>${note}`;
    }
    return `<dl class="summary-list">${summary().map(([name, value]) => `<div><dt>${name}</dt><dd>${value}</dd></div>`).join("")}</dl>`;
  }

  function renderPage(focusHeading = false) {
    const page = pages[pageIndex];
    content.innerHTML = `<h2 tabindex="-1" id="step-title">${page.title}</h2><p class="section-intro">${page.intro}</p>${selectionFields(page)}`;
    for (const button of stepButtons) {
      const group = Number(button.dataset.step);
      button.classList.toggle("is-active", group === page.group);
      button.classList.toggle("is-complete", group < page.group);
      if (group === page.group) button.setAttribute("aria-current", "step");
      else button.removeAttribute("aria-current");
    }
    const finished = page.key === "summary";
    id("step-counter").textContent = finished ? "Overzicht" : `Keuze ${pageIndex + 1} van ${pages.length - 1}`;
    back.hidden = pageIndex === 0;
    next.textContent = finished ? "Opnieuw beginnen" : page.key === "size" ? "Bekijk overzicht" : "Volgende";
    updatePreview();
    if (focusHeading) {
      const stacked = window.matchMedia("(max-width: 680px)").matches;
      content.querySelector("h2").focus({ preventScroll: stacked });
      if (stacked) {
        id("gallery").parentElement.scrollIntoView({ block: "start", behavior: "instant" });
      }
    }
  }

  function goTo(index) {
    if (index < 0 || index >= pages.length || index === pageIndex) return;
    pageIndex = index;
    renderPage(true);
  }

  content.addEventListener("change", event => {
    const input = event.target;
    if (input.tagName === "SELECT") config[input.name] = Number(input.value);
    else if (input.type === "radio") {
      config[input.name] = input.value;
      content.querySelectorAll(".model-row").forEach(row =>
        row.classList.toggle("is-selected", row.querySelector("input").checked)
      );
    } else return;
    if (id("depth-note")) id("depth-note").textContent = depthNote();
    updatePreview();
  });
  stepButtons.forEach(button => button.addEventListener("click", () =>
    goTo(pages.findIndex(page => page.group === Number(button.dataset.step)))
  ));
  back.addEventListener("click", () => goTo(pageIndex - 1));
  next.addEventListener("click", () => {
    if (pages[pageIndex].key === "summary") {
      config = defaults();
      goTo(0);
    } else goTo(pageIndex + 1);
  });

  renderPage();
})();
