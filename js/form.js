/**
 * Form Module
 * Multi-step eligibility form wizard with validation, state search,
 * and submission handling. Supports 10 steps (6 required, 4 optional).
 */
const Form = (() => {
  'use strict';

  // ── Constants ──────────────────────────────────────────────────────────
  const TOTAL_STEPS = 10;

  const STATES = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
    'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
    'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
    'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
    'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
    'Andaman and Nicobar Islands', 'Chandigarh',
    'Dadra and Nagar Haveli and Daman and Diu',
    'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry',
  ];

  const STEP_SUBTITLES = [
    'Step 1 of 10: Full Name',
    'Step 2 of 10: Age',
    'Step 3 of 10: State or UT',
    'Step 4 of 10: Annual Family Income',
    'Step 5 of 10: Occupation',
    'Step 6 of 10: Social Category',
    'Step 7 of 10: Gender (Optional)',
    'Step 8 of 10: Marital Status (Optional)',
    'Step 9 of 10: Disability Status (Optional)',
    'Step 10 of 10: Additional situations (Optional)'
  ];

  // ── State ──────────────────────────────────────────────────────────────
  let currentStep = 1;
  const formData = {
    name: '',
    age: null,
    state: '',
    income: null,
    occupation: '',
    category: '',
    gender: '',
    marital: '',
    disability: '',
    situations: [],
  };

  // ── DOM References (lazily fetched) ────────────────────────────────────
  const el = (id) => document.getElementById(id);
  const qa = (sel) => document.querySelectorAll(sel);

  // ── Initialization ─────────────────────────────────────────────────────
  function init() {
    setupNameInput();
    setupAgeInput();
    setupStateSearch();
    setupIncomeInput();
    setupOccupationSelect();
    setupCategorySelect();
    setupOptionCards();
    setupNavigationButtons();
    updateProgressBar();
    updateButtonStates();
  }

  // ── Name Input (Step 1) ────────────────────────────────────────────────
  function setupNameInput() {
    const nameInput = el('nameInput');
    const nameValidation = el('nameValidation');
    if (!nameInput) return;

    nameInput.addEventListener('input', () => {
      formData.name = nameInput.value.trim();
      if (nameValidation) {
        nameValidation.textContent = '';
        nameValidation.style.display = 'none';
      }
    });
  }

  // ── Age Input (Step 2) ─────────────────────────────────────────────────
  function setupAgeInput() {
    const ageInput = el('ageInput');
    const ageGroup = el('ageGroup');
    const ageValidation = el('ageValidation');
    if (!ageInput) return;

    ageInput.addEventListener('input', () => {
      const age = parseInt(ageInput.value, 10);
      formData.age = isNaN(age) ? null : age;

      // Show age group
      if (ageGroup) {
        ageGroup.textContent = getAgeGroup(age);
        ageGroup.classList.toggle('visible', !isNaN(age));
      }

      // Clear validation on input
      if (ageValidation) {
        ageValidation.textContent = '';
        ageValidation.style.display = 'none';
      }
    });
  }

  function getAgeGroup(age) {
    if (isNaN(age) || age < 0) return '';
    if (age <= 17) return '👶 Child (0–17)';
    if (age <= 35) return '🧑 Youth (18–35)';
    if (age <= 59) return '🧑&zwj;💼 Adult (36–59)';
    return '🧓 Senior (60+)';
  }

  // ── State Search (Step 3) ──────────────────────────────────────────────
  function setupStateSearch() {
    const searchInput = el('stateSearch');
    const dropdown = el('stateDropdown');
    const hiddenInput = el('stateInput');
    const selectedDisplay = el('selectedState');
    const validation = el('stateValidation');

    if (!searchInput || !dropdown) return;

    // Populate on focus or input
    searchInput.addEventListener('input', () => {
      const query = searchInput.value.trim().toLowerCase();
      const filtered = query
        ? STATES.filter((s) => s.toLowerCase().includes(query))
        : STATES;
      renderDropdown(filtered);
    });

    searchInput.addEventListener('focus', () => {
      const query = searchInput.value.trim().toLowerCase();
      const filtered = query
        ? STATES.filter((s) => s.toLowerCase().includes(query))
        : STATES;
      renderDropdown(filtered);
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!searchInput.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.innerHTML = '';
        dropdown.classList.remove('open');
      }
    });

    function renderDropdown(states) {
      dropdown.innerHTML = '';

      if (states.length === 0) {
        dropdown.classList.add('open');
        const noResult = document.createElement('div');
        noResult.className = 'state-option no-result';
        noResult.textContent = 'No states found';
        dropdown.appendChild(noResult);
        return;
      }

      dropdown.classList.add('open');
      states.forEach((state) => {
        const item = document.createElement('div');
        item.className = 'state-option';
        item.textContent = state;
        item.addEventListener('click', () => selectState(state));
        dropdown.appendChild(item);
      });
    }

    function selectState(state) {
      formData.state = state;
      if (hiddenInput) hiddenInput.value = state;
      if (selectedDisplay) {
        selectedDisplay.textContent = state;
        selectedDisplay.classList.add('visible');
      }
      searchInput.value = state;
      dropdown.innerHTML = '';
      dropdown.classList.remove('open');

      // Clear validation
      if (validation) {
        validation.textContent = '';
        validation.style.display = 'none';
      }
    }
  }

  // ── Income Input (Step 4) ──────────────────────────────────────────────
  function setupIncomeInput() {
    const incomeInput = el('incomeInput');
    const incomeValidation = el('incomeValidation');
    if (!incomeInput) return;

    incomeInput.addEventListener('input', () => {
      const val = parseInt(incomeInput.value, 10);
      formData.income = isNaN(val) ? null : val;
      if (incomeValidation) {
        incomeValidation.textContent = '';
        incomeValidation.style.display = 'none';
      }
    });
  }

  // ── Occupation Select (Step 5) ─────────────────────────────────────────
  function setupOccupationSelect() {
    const select = el('occupationSelect');
    const validation = el('occupationValidation');
    if (!select) return;

    select.addEventListener('change', () => {
      formData.occupation = select.value;
      if (validation) {
        validation.textContent = '';
        validation.style.display = 'none';
      }
    });
  }

  // ── Category Select (Step 6) ───────────────────────────────────────────
  function setupCategorySelect() {
    const select = el('categorySelect');
    const validation = el('categoryValidation');
    if (!select) return;

    select.addEventListener('change', () => {
      formData.category = select.value;
      if (validation) {
        validation.textContent = '';
        validation.style.display = 'none';
      }
    });
  }

  // ── Option Cards (Steps 7, 8, 9, 10) ──────────────────────────────────
  function setupOptionCards() {
    qa('.option-card input').forEach((input) => {
      input.addEventListener('change', () => {
        const card = input.closest('.option-card');
        if (!card) return;

        if (input.type === 'radio') {
          const name = input.name;
          const group = card.closest('.form-step') || card.parentElement;
          group.querySelectorAll('.option-card').forEach((c) => {
            c.classList.toggle('selected', c.querySelector(`input[name="${name}"]`)?.checked);
          });
          formData[name] = input.value;
        } else {
          card.classList.toggle('selected', input.checked);
          handleCheckboxChange(input, card);
        }

        // Clear validation
        const validationEl = el(`${input.name}Validation`);
        if (validationEl) {
          validationEl.textContent = '';
          validationEl.style.display = 'none';
        }
      });
    });
  }

  function handleCheckboxChange(input, card) {
    const situationsGrid = el('situationsGrid');
    if (!situationsGrid) return;

    if (input.value === 'None of these') {
      if (input.checked) {
        // Uncheck all other checkboxes
        situationsGrid.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
          if (cb.value !== 'None of these') {
            cb.checked = false;
            cb.closest('.option-card')?.classList.remove('selected');
          }
        });
      }
    } else {
      if (input.checked) {
        // Uncheck "None of these"
        const noneCb = el('situationNone');
        if (noneCb) {
          noneCb.checked = false;
          noneCb.closest('.option-card')?.classList.remove('selected');
        }
      }
    }

    // Collect checked items
    const checked = [];
    situationsGrid.querySelectorAll('input[type="checkbox"]:checked').forEach((cb) => {
      checked.push(cb.value);
    });
    formData.situations = checked;
  }

  // ── Navigation Buttons ─────────────────────────────────────────────────
  function setupNavigationButtons() {
    const prevBtn = el('prevBtn');
    const nextBtn = el('nextBtn');
    const submitBtn = el('submitBtn');

    prevBtn?.addEventListener('click', () => {
      if (currentStep > 1) {
        goToStep(currentStep - 1, 'backward');
      }
    });

    nextBtn?.addEventListener('click', () => {
      if (validateStep(currentStep)) {
        goToStep(currentStep + 1, 'forward');
      }
    });

    submitBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      if (validateStep(currentStep)) {
        handleSubmit();
      }
    });
  }

  // ── Step Navigation ────────────────────────────────────────────────────
  function goToStep(step, direction) {
    if (step < 1 || step > TOTAL_STEPS) return;

    const currentEl = document.querySelector(`.form-step[data-step="${currentStep}"]`);
    const nextEl = document.querySelector(`.form-step[data-step="${step}"]`);
    if (!currentEl || !nextEl) return;

    const exitClass = direction === 'forward' ? 'exit-left' : 'exit-right';
    currentEl.classList.add(exitClass);
    currentEl.classList.remove('active');

    setTimeout(() => {
      currentEl.classList.remove(exitClass);
      nextEl.classList.add('active');
      currentStep = step;
      updateProgressBar();
      updateButtonStates();
      updateProgressSteps();

      // Dynamic header subtitle
      const subtitleEl = el('formSubtitle');
      if (subtitleEl) {
        subtitleEl.textContent = STEP_SUBTITLES[currentStep - 1];
      }
    }, 300);
  }

  // ── Progress Bar & Steppers ────────────────────────────────────────────
  function updateProgressBar() {
    const fill = el('progressFill');
    if (fill) {
      fill.style.width = `${(currentStep / TOTAL_STEPS) * 100}%`;
    }
  }

  function updateProgressSteps() {
    qa('.progress-step').forEach((step) => {
      const stepNum = parseInt(step.dataset.step, 10);
      step.classList.toggle('active', stepNum === currentStep);
      step.classList.toggle('completed', stepNum < currentStep);
    });
  }

  function updateButtonStates() {
    const prevBtn = el('prevBtn');
    const nextBtn = el('nextBtn');
    const submitBtn = el('submitBtn');

    if (prevBtn) {
      prevBtn.disabled = currentStep === 1;
      prevBtn.style.visibility = currentStep === 1 ? 'hidden' : 'visible';
    }

    if (nextBtn && submitBtn) {
      if (currentStep === TOTAL_STEPS) {
        nextBtn.style.display = 'none';
        submitBtn.style.display = 'inline-flex';
      } else {
        nextBtn.style.display = 'inline-flex';
        submitBtn.style.display = 'none';
      }
    }
  }

  // ── Validation ─────────────────────────────────────────────────────────
  function validateStep(step) {
    switch (step) {
      case 1:
        return validateName();
      case 2:
        return validateAge();
      case 3:
        return validateState();
      case 4:
        return validateIncome();
      case 5:
        return validateSelect('occupationSelect', 'occupationValidation', 'Please select your occupation.');
      case 6:
        return validateSelect('categorySelect', 'categoryValidation', 'Please select your social category.');
      default:
        // Optional steps are always valid
        return true;
    }
  }

  function validateName() {
    const input = el('nameInput');
    const validation = el('nameValidation');
    const value = input?.value.trim() || '';

    if (value.length < 2) {
      showValidation(validation, 'Please enter your full name (at least 2 characters).');
      input?.focus();
      return false;
    }

    formData.name = value;
    hideValidation(validation);
    return true;
  }

  function validateAge() {
    const ageInput = el('ageInput');
    const validation = el('ageValidation');
    const value = parseInt(ageInput?.value, 10);

    if (isNaN(value) || value < 1 || value > 120) {
      showValidation(validation, 'Please enter a valid age between 1 and 120.');
      ageInput?.focus();
      return false;
    }

    formData.age = value;
    hideValidation(validation);
    return true;
  }

  // Validation helper state
  const STATES_LIST = STATES;

  function validateState() {
    const validation = el('stateValidation');
    const hiddenInput = el('stateInput');
    const state = hiddenInput?.value || formData.state;

    if (!state || !STATES_LIST.includes(state)) {
      showValidation(validation, 'Please select a valid state or UT.');
      el('stateSearch')?.focus();
      return false;
    }

    formData.state = state;
    hideValidation(validation);
    return true;
  }

  function validateIncome() {
    const input = el('incomeInput');
    const validation = el('incomeValidation');
    const value = parseInt(input?.value, 10);

    if (isNaN(value) || value < 0) {
      showValidation(validation, 'Please enter a valid family income (0 or more).');
      input?.focus();
      return false;
    }

    formData.income = value;
    hideValidation(validation);
    return true;
  }

  function validateSelect(id, validationId, message) {
    const select = el(id);
    const validation = el(validationId);
    const value = select?.value;

    if (!value) {
      showValidation(validation, message);
      select?.focus();
      return false;
    }

    const field = id.replace('Select', ''); // occupation or category
    formData[field] = value;
    hideValidation(validation);
    return true;
  }

  function showValidation(element, message) {
    if (!element) return;
    element.textContent = message;
    element.style.display = 'block';
    element.classList.add('shake');
    setTimeout(() => element.classList.remove('shake'), 500);
  }

  function hideValidation(element) {
    if (!element) return;
    element.textContent = '';
    element.style.display = 'none';
  }

  // ── Form Submission ────────────────────────────────────────────────────
  function handleSubmit() {
    // Gather values
    formData.name = el('nameInput')?.value.trim() || '';
    formData.age = parseInt(el('ageInput')?.value, 10) || null;
    formData.state = el('stateInput')?.value || formData.state;
    formData.income = parseInt(el('incomeInput')?.value, 10) || 0;
    formData.occupation = el('occupationSelect')?.value || '';
    formData.category = el('categorySelect')?.value || '';

    const genderRadio = document.querySelector('input[name="gender"]:checked');
    formData.gender = genderRadio ? genderRadio.value : '';

    const maritalRadio = document.querySelector('input[name="marital"]:checked');
    formData.marital = maritalRadio ? maritalRadio.value : '';

    const disabilityRadio = document.querySelector('input[name="disability"]:checked');
    formData.disability = disabilityRadio ? disabilityRadio.value : '';

    const checked = [];
    qa('#situationsGrid input[type="checkbox"]:checked').forEach((cb) => {
      checked.push(cb.value);
    });
    formData.situations = checked;

    // Send to results page handler
    if (typeof Results !== 'undefined' && Results.handleSubmission) {
      Results.handleSubmission({ ...formData });
    }
  }

  // ── Reset ──────────────────────────────────────────────────────────────
  function reset() {
    currentStep = 1;
    formData.name = '';
    formData.age = null;
    formData.state = '';
    formData.income = null;
    formData.occupation = '';
    formData.category = '';
    formData.gender = '';
    formData.marital = '';
    formData.disability = '';
    formData.situations = [];

    el('eligibilityForm')?.reset();

    qa('.option-card').forEach((c) => c.classList.remove('selected'));
    qa('.form-step').forEach((s) => s.classList.remove('active', 'exit-left', 'exit-right'));
    
    const firstStep = document.querySelector('.form-step[data-step="1"]');
    if (firstStep) firstStep.classList.add('active');

    if (el('formSubtitle')) el('formSubtitle').textContent = STEP_SUBTITLES[0];
    if (el('ageGroup')) {
      el('ageGroup').textContent = '';
      el('ageGroup').classList.remove('visible');
    }
    if (el('selectedState')) {
      el('selectedState').textContent = '';
      el('selectedState').classList.remove('visible');
    }

    updateProgressBar();
    updateButtonStates();
    updateProgressSteps();
  }

  return { init, reset };
})();
