import {FormField} from "./FormField";
import {TaxonSearch} from "../utils/TaxonSearch";
import {Taxon} from "../models/Taxon";
import {doubleClickIntercepted} from "../utils/stopDoubleClick";

const CSS_UNRECOGNIZED_TAXON_CLASS = 'taxon-invalid';
const CSS_UNRECOGNIZED_TAXON_CONTAINER_CLASS = 'taxon-unrecognized-container';
const CSS_DROPDOWN_FOCUSED = 'dropdown-focused';
const CSS_DROPDOWN_SELECTED = 'taxon-selected';

export class TaxonPickerField extends FormField {
    /**
     * @type {TaxonSearch}
     */
    taxonSearch;

    /**
     * @type {string}
     */
    #inputFieldId;

    /**
     * @type {string}
     */
    #dropDownListDivId;

    /**
     * @type {string}
     */
    #dropDownListUlId;

    /**
     * @type {string}
     */
    #wrapperDivId;

    /**
     * @type {string}
     */
    #containerId;

    /**
     * @type {string}
     */
    #unrecognizedWarningElId;

    #taxonLookupTimeoutHandle = null;

    #changeEventTimeout = null;

    /**
     *
     * @type {null|number}
     */
    #selectedIndex = null;

    /**
     *
     * @type {string}
     * @private
     */
    _lastInputValue = '';

    unrecognizedWarningText = "" // was "The name that you have typed hasn't been matched. If possible please pick an entry from the drop-down list of suggestions.";

    /**
     *
     * @type {boolean}
     */
    alwaysUseAcceptedName = true;

    /**
     *
     * @type {boolean}
     */
    allowTaxonMismatches = false;

    // /**
    //  *
    //  * @type {boolean}
    //  */
    // hideSensuStricto = true;

    hangLeft = false;

    /**
     * @type {Array.<{entityId: string,
                        vernacular: string,
                        qname: string,
                        name: string,
                        qualifier: string,
                        authority: string,
                        uname: string,
                        vernacularMatched: boolean,
                        exact: boolean,
                        near: boolean,
                        formatted: string,
                        acceptedEntityId: string=,
                        acceptedNameString: string=,
                        acceptedQualifier: string=,
                        acceptedAuthority: string=,
                        acceptedQname: string=,
                        }>}
     */
    #searchResults = [];

    /**
     *
     * @type {{taxonName: string, taxonId: string, vernacularMatch: boolean|null}}
     * @private
     */
    _value = {
        taxonId: '',
        taxonName: '',
        vernacularMatch: false
    };

    /**
     *
     * @type {string}
     */
    #previousId = '';

    static timeoutDelay = 50;

    /**
     *
     */
    constructor () {
        super();

        this.taxonSearch = new TaxonSearch();
    }

    /**
     *
     * @param {({taxonName: string, taxonId: string, vernacularMatch: boolean|null}|null)} taxonSpec
     */
    set value(taxonSpec) {
        let taxon;

        if (taxonSpec && taxonSpec.taxonId) {
            // this will trigger an error if somehow an invalid id was supplied
            taxon = Taxon.fromId(taxonSpec.taxonId);

            const qname = taxon.nameString + (taxon.qualifier ? (` ${taxon.qualifier}`) : '');

            // build the saved values from the dictionary rather than from the literal user entry (which may use different formatting)
            this._value = {
                taxonId: taxon.id,
                taxonName: taxonSpec.vernacularMatch ? taxon.vernacular : qname,
                vernacularMatch: taxonSpec.vernacularMatch
            };
        } else {
            this._value = {
                taxonId: '',
                taxonName: taxonSpec && taxonSpec.taxonName ? taxonSpec.taxonName : '',
                vernacularMatch: null
            };
        }

        this.updateView();
    }

    /**
     *
     * @returns {({taxonName: string, taxonId: string, vernacularMatch: boolean}|null)}
     */
    get value() {
        return this._value;
    }

    /**
     *
     * @param {({taxonName: string, taxonId: string, vernacularMatch: boolean}|null)} value
     * @returns {boolean}
     */
    static isEmpty(value) {
        return !value || (value && !value.taxonName);
    }

    updateView() {
        if (this._fieldEl) {
            // do nothing until the view has been constructed

            const inputEl = document.getElementById(this.#inputFieldId);
            inputEl.value = this._value.taxonName;

            if (this._value.taxonId) {
                const taxon = Taxon.fromId(this._value.taxonId);

                inputEl.title = taxon.nameString +
                    (taxon.qualifier ? (` ${taxon.qualifier}`) : '') +
                    (taxon.authority ? (` ${taxon.authority}`) : '') +
                    (taxon.vernacular ? ` “${taxon.vernacular}”` : '');
            } else {
                inputEl.title = "Search for a taxon.";
            }

            this._lastInputValue = this._value.taxonName; // probably not necessary

            const unrecognizedWarningEl = document.getElementById(this.#unrecognizedWarningElId);

            if (unrecognizedWarningEl) {
                if (this._value.taxonName) {
                    if (this._value.taxonId) {
                        unrecognizedWarningEl.classList.remove(CSS_UNRECOGNIZED_TAXON_CLASS);
                    } else {
                        unrecognizedWarningEl.classList.add(CSS_UNRECOGNIZED_TAXON_CLASS);
                    }
                } else {
                    unrecognizedWarningEl.classList.remove(CSS_UNRECOGNIZED_TAXON_CLASS);
                }
            }
        }
    }

    /**
     *
     * @param {(boolean|null)} isValid
     */
    markValidity(isValid) {
        const el = document.getElementById(this.#inputFieldId);

        if (null === isValid) {
            el.classList.remove('is-invalid', 'is-valid');
        } else {
            el.classList.remove(isValid ? 'is-invalid' : 'is-valid');
            el.classList.add(isValid ? 'is-valid' : 'is-invalid');
        }
    }

    /**
     * initialises this._fieldEl
     *
     * @returns {void}
     */
    buildField() {
        const container = document.createElement('div');
        container.className = 'form-group mb-3';
        this.#containerId = container.id = FormField.nextId;

        this.#inputFieldId = FormField.nextId;

        if (this.unrecognizedWarningText) {
            const unrecognizedWarningEl = container.appendChild(document.createElement('p'));
            unrecognizedWarningEl.id = this.#unrecognizedWarningElId = FormField.nextId;
            unrecognizedWarningEl.className = CSS_UNRECOGNIZED_TAXON_CONTAINER_CLASS;
            unrecognizedWarningEl.textContent = this.unrecognizedWarningText;
        }

        if (this.label) {
            const labelEl = container.appendChild(document.createElement('label'));
            labelEl.htmlFor = this.#inputFieldId;
            labelEl.textContent = this.label;
        }

        const wrapperEl = container.appendChild(document.createElement('div'));
        wrapperEl.className = 'dropdown-wrapper';
        this.#wrapperDivId = wrapperEl.id = FormField.nextId;

        const inputField = wrapperEl.appendChild(document.createElement('input'));
        inputField.className = "form-control dropdown-input";
        inputField.id = this.#inputFieldId;
        inputField.autocomplete = 'off';
        inputField.spellcheck = false;
        inputField.type = 'search';
        inputField.placeholder = 'Search for a taxon';
        inputField.setAttribute('aria-autocomplete', 'list');
        inputField.setAttribute('role', 'combobox');
        inputField.setAttribute('aria-expanded', 'false');
        inputField.setAttribute('aria-activedescendant', '');

        if (this.validationMessage) {
            // unfortunately the validation message has to be placed immediately after the input field
            const validationMessageElement = wrapperEl.appendChild(document.createElement('div'));
            validationMessageElement.className = 'invalid-feedback';
            validationMessageElement.innerHTML = this.validationMessage;
        }

        const dropDownList = wrapperEl.appendChild(document.createElement('div'));
        dropDownList.className = 'dropdown-list';
        this.#dropDownListDivId = dropDownList.id = FormField.nextId;
        dropDownList.setAttribute('role', 'listbox');

        inputField.setAttribute('aria-controls', this.#dropDownListDivId);

        this.#dropDownListUlId = FormField.nextId;

        if (this.helpText) {
            const helpTextField = container.appendChild(document.createElement('small'));
            helpTextField.innerHTML = this.helpText;
        }

        inputField.addEventListener('keydown', this.keydownHandler.bind(this));
        inputField.addEventListener('input', this.inputHandler.bind(this));
        inputField.addEventListener('change', this.inputChangeHandler.bind(this));

        container.addEventListener('focusin', this.focusHandler.bind(this));
        container.addEventListener('focusout', this.blurHandler.bind(this));
        dropDownList.addEventListener('click', this.dropboxClickHandler.bind(this));


        this._fieldEl = container;
    }

    /**
     *
     * @param {number} tabIndex
     */
    setTabIndex(tabIndex) {
        const inputEl = document.getElementById(this.#inputFieldId);

        if (inputEl) {
            inputEl.tabIndex = tabIndex;
        }
    }

    /**
     *
     * @param {KeyboardEvent} event
     * @param {HTMLInputElement} event.target
     * @return {boolean}
     */
    keydownHandler(event) {
        this._lastInputValue = event.target.value.trimStart(); // save value for testing in InputEvent handler

        switch (event.key) {
            case 'Enter':
                event.preventDefault();

                this.#applyResult(event);
                break;

            case 'ArrowUp':
                event.preventDefault();

                if (this.#selectedIndex > 0) {
                    this.setSelectedIndex(this.#selectedIndex - 1);
                }
                break;

            case 'ArrowDown':
                event.preventDefault();

                if (this.#searchResults.length) {
                    if (this.#selectedIndex === null) {
                        this.setSelectedIndex(0);
                    } else if (this.#selectedIndex < this.#searchResults.length - 1) {
                        this.setSelectedIndex(this.#selectedIndex + 1);
                    }
                }
                break;

            case 'Escape':
                // see https://www.w3.org/WAI/ARIA/apg/patterns/combobox/examples/combobox-autocomplete-list/#kbd_label_textbox

                // expected aria behaviour for combo box
                // If the listbox is displayed, closes it.
                // If the listbox is not displayed, clears the textbox.

                event.preventDefault();
                if (this.#searchResults.length && this.#selectedIndex !== null) {
                    this.#applyResult(event);
                } else {
                    const inputEl = document.getElementById(this.#inputFieldId);
                    inputEl.value = '';
                    this.#searchResults.length = 0;
                    inputEl.blur();
                }
                break;
        }
    }

    /**
     * called after enter pressed or escape pressed with a selected match
     *
     * @param {KeyboardEvent} event
     */
    #applyResult(event) {
        if (this.#taxonLookupTimeoutHandle) {
            clearTimeout(this.#taxonLookupTimeoutHandle);
            this.#taxonLookupTimeoutHandle = null;
        }

        this.inputChangeHandler(event);

        const dropDownEl = document.getElementById(this.#wrapperDivId);
        dropDownEl.classList.remove(CSS_DROPDOWN_FOCUSED);

        document.body.classList.remove('hide-controls');
        document.getElementById(this.#inputFieldId).blur();

        // setting of result will be handled during blur instead
    }

    /**
     *
     * @param {InputEvent} event
     */
    inputHandler(event) {
        const currentValue = event.target.value.trimStart(); // save value for testing in InputEvent handler

        if (currentValue !== this._lastInputValue) {
            this.#triggerQuery(event.target);
        }
    }

    /**
     *
     * @param {HTMLInputElement} inputEl
     */
    #triggerQuery(inputEl) {
        let text = FormField.cleanRawInput(inputEl);

        // Clear previous timeout
        if (this.#taxonLookupTimeoutHandle) {
            clearTimeout(this.#taxonLookupTimeoutHandle);
        }

        // proceed if minimum length phrase was provided
        if ((text.length) >= TaxonSearch.MIN_SEARCH_LENGTH) {

            // Set new timeout - don't run if user is typing
            this.#taxonLookupTimeoutHandle = setTimeout(() => {
                this.#searchResults = this.taxonSearch.lookup(
                    FormField.cleanRawInput(document.getElementById(this.#inputFieldId))
                );

                this.refreshSearchResultsList();

                this.#taxonLookupTimeoutHandle = null;
            }, TaxonPickerField.timeoutDelay);
        } else {
            // clear the results list
            this.#searchResults = [];
            this.refreshSearchResultsList();
        }
    }

    /**
     *
     * @param {Event} event
     */
    focusHandler(event) {
       const dropDownWrapperEl = document.getElementById(this.#wrapperDivId);

       if (!dropDownWrapperEl.classList.contains(CSS_DROPDOWN_FOCUSED)) {
            // Refresh dropdown list when first focused.
            // The focus event will re-fire after click on link in dropdown potentially disrupting subsequent click
            // it is important that the query is not re-run if already focused.
            const inputEl = document.getElementById(this.#inputFieldId);
            this.#triggerQuery(inputEl);

            dropDownWrapperEl.classList.add(CSS_DROPDOWN_FOCUSED);

            // kludgy work-around for a z-index problem on mobile
            // buttons pop-through the dropdown list, so temporarily hide them all
            document.body.classList.add('hide-controls');

            if (this.hangLeft) {
                const dropDownEl = document.getElementById(this.#dropDownListDivId);

                dropDownEl.style.right = '0';
                dropDownEl.style.position = 'absolute';
                dropDownEl.style.width = '24em';
            }

            if (this._value.taxonId && this._value.taxonName === inputEl.value && !this._value.vernacularMatch) {
                const firstSpace = this._value.taxonName.indexOf(' ');

                if (firstSpace > -1) {
                    inputEl.setSelectionRange(firstSpace + 1, inputEl.value.length, 'backward');
                }
            }
        }
    }

    /**
     *
     * @param {Event} event
     */
    blurHandler(event) {
        // clear taxon result lookup timeout
        if (this.#taxonLookupTimeoutHandle) {
            clearTimeout(this.#taxonLookupTimeoutHandle);
            this.#taxonLookupTimeoutHandle = null;
        }

        // to avoid blurring before a link click has been processed, introduce a delay
        setTimeout(() => {
            const dropDownEl = document.getElementById(this.#wrapperDivId);
            dropDownEl.classList.remove(CSS_DROPDOWN_FOCUSED);

            const inputEl = document.getElementById(this.#inputFieldId);
            inputEl.setAttribute('aria-expanded', 'false');
            inputEl.setAttribute('aria-activedescendant', '');

            document.body.classList.remove('hide-controls');

        }, 500);
    }

    refreshSearchResultsList() {
        const dropdownListEl = document.getElementById(this.#dropDownListDivId);
        const inputEl = document.getElementById(this.#inputFieldId);

        this.#selectedIndex = null;
        if (this.#searchResults.length) {
            const htmlResults = [];

            let n = 0;
            for (let result of this.#searchResults) {
                let itemId = `taxonitem${this.#dropDownListDivId}_${result.entityId}`;
                htmlResults[htmlResults.length] = `<a class="list-group-item list-group-item-action" href="#" data-occurrenceId="${result.entityId}" data-resultnumber="${n}" id="${itemId}">${TaxonSearch.formatter(result)}</a>`;
                ++n;
            }

            dropdownListEl.innerHTML = `<div class="list-group" id="${this.#dropDownListUlId}">${htmlResults.join('')}</div>`;

            if (this.#searchResults[0].exact) {
                this.setSelectedIndex(0);
            }

            inputEl.setAttribute('aria-expanded', 'true');
        } else {
            dropdownListEl.innerHTML = `<div class="list-group" id="${this.#dropDownListUlId}"><p class="taxon-picker-type-prompt">Start typing the name of a taxon.</p></div>`;
            inputEl.setAttribute('aria-expanded', 'false');
            inputEl.setAttribute('aria-activedescendant', '');
        }
    }

    /**
     *
     * @param {number|null} n
     */
    setSelectedIndex(n) {
        if (n !== this.#selectedIndex) {
            if (null !== this.#selectedIndex) {
                // clear existing selection

                const selectedEl = document.querySelector(`div#${this.#dropDownListDivId} a[data-resultnumber="${this.#selectedIndex}"]`);
                if (selectedEl) {
                    selectedEl.classList.remove(CSS_DROPDOWN_SELECTED);
                    selectedEl.setAttribute('aria-selected', 'false');
                }
            }

            const selectedEl = document.querySelector(`div#${this.#dropDownListDivId} a[data-resultnumber="${n}"]`);
            if (selectedEl) {
                selectedEl.classList.add(CSS_DROPDOWN_SELECTED);
                this.#selectedIndex = n;
                selectedEl.setAttribute('aria-selected', 'true');

                const inputEl = document.getElementById(this.#inputFieldId);
                inputEl.setAttribute('aria-activedescendant', selectedEl.id);
            } else {
                this.#selectedIndex = null; // something's gone wrong
            }
        }
    }

    static cleanRawInput(inputElement) {
        return inputElement.value.trim().replace(/\s\s+/g, ' ');
    }

    /**
     *
     * @param {MouseEvent} event
     */
    dropboxClickHandler(event) {
        if (doubleClickIntercepted(event)) {
            return;
        }

        const targetEl = event.target.closest('a');

        if (this.#changeEventTimeout) {
            clearTimeout(this.#changeEventTimeout);
            this.#changeEventTimeout = null;
        }

        if (targetEl && targetEl.dataset.occurrenceid) {
            event.preventDefault();

            this.#setResult(parseInt(targetEl.dataset.resultnumber));
        }
    }


    /**
     *
     * @param {number} n
     */
    #setResult(n) {
        const result = this.#searchResults[n];

        if (result.acceptedEntityId && this.alwaysUseAcceptedName) {
            // have a non-accepted result

            this.value = {
                taxonId: result.acceptedEntityId,
                taxonName: result.acceptedQname,
                vernacularMatch: false
            };
        } else {
            this.value = {
                taxonId: result.entityId,
                taxonName: result.vernacularMatched ? result.vernacular : result.qname,
                vernacularMatch: result.vernacularMatched
            };
        }


        if (this.#previousId !== this._value.taxonId) {
            this.#previousId = this._value.taxonId;
            this.fireEvent(FormField.EVENT_CHANGE);
        }
    }

    /**
     * Sets taxon picker value using a taxon entity id
     * refreshes view
     * *does not* trigger change event
     *
     * @param {string} taxonId
     * @throws TaxonError
     */
    setTaxonFromId(taxonId) {
        if (taxonId) {
            let taxon = Taxon.fromId(taxonId);
            if (taxon.acceptedEntityId) {
                taxon = Taxon.fromId(taxon.acceptedEntityId);
            }

            const qname = taxon.nameString + (taxon.qualifier ? (` ${taxon.qualifier}`) : '');

            this.value = {
                taxonId: taxon.id,
                taxonName: qname,
                vernacularMatch: false
            };
        } else {
            this.value = {
                taxonId: '',
                taxonName: '',
                vernacularMatch: null
            };
        }

        this.#previousId = this._value.taxonId;
        this.updateView();
    }

    inputChangeHandler (event) {
        // need to prevent race-conditions between clicks and change events
        // i.e. a click event on the dropdown list might come after a change event on the input field

        event.stopPropagation();

        if (this.#changeEventTimeout) {
            clearTimeout(this.#changeEventTimeout);
        }

        // avoid acting on a change immediately, in case there is a click event following
        this.#changeEventTimeout = setTimeout(() => {
            //console.log('processing taxon field input change event');

            const rawValue = document.getElementById(this.#inputFieldId).value;
            if (rawValue === '') {
                // value is blank, probably after x button clicked

                // clear taxon result lookup timeout
                if (this.#taxonLookupTimeoutHandle) {
                    clearTimeout(this.#taxonLookupTimeoutHandle);
                    this.#taxonLookupTimeoutHandle = null;
                }

                // apply immediate blur
                const dropDownEl = document.getElementById(this.#wrapperDivId);
                dropDownEl.classList.remove(CSS_DROPDOWN_FOCUSED);
            } else {
                let exactMatch;
                if (this.#selectedIndex !== null) {
                    exactMatch = this.#searchResults[this.#selectedIndex];
                } else {
                    // check if the dropdown list has an exact match, if so then use it
                    exactMatch = this.#searchResults.find((result) => {
                        return result.exact;
                    });
                }

                if (exactMatch) {
                    //console.log('exact match');

                    if (exactMatch.acceptedEntityId && this.alwaysUseAcceptedName) {
                        // have a non-accepted result

                        this.value = {
                            taxonId: exactMatch.acceptedEntityId,
                            taxonName: exactMatch.acceptedQname,
                            vernacularMatch: false
                        };
                    } else {
                        this.value = {
                            taxonId: exactMatch.entityId,
                            taxonName: exactMatch.vernacularMatched ? exactMatch.vernacular : exactMatch.qname,
                            vernacularMatch: exactMatch.vernacularMatched
                        }; // setter will refresh the field but not fire a change event
                    }
                } else {
                    //console.log('no match');

                    this.value = {
                        taxonId: '',
                        taxonName: this.allowTaxonMismatches ? document.getElementById(this.#inputFieldId).value.trim() : '',
                        vernacularMatch: null
                    };
                }
            }

            if (this.#previousId !== this._value.taxonId) {
                this.#previousId = this._value.taxonId;
                this.fireEvent(FormField.EVENT_CHANGE);
            }
        }, 500);
    }
}
