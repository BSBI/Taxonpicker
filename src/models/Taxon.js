import {TaxonError} from "../utils/exceptions/TaxonError";
import {escapeHTML} from "../utils/escapeHTML";

export class Taxon {
    /**
     * @typedef RawTaxon
     * @type {array}
     * @property {string} 0 - nameString
     * @property {(string|number)} 1 - canonical
     * @property {string} 2 hybridCanonical, raw entry is 0 if canonical == hybridCanonical
     * @property {(string|number)} 3 acceptedEntityId or 0 if name is accepted
     * @property {string} 4 qualifier
     * @property {string} 5 authority
     * @property {string} 6 vernacular
     * @property {string} 7 vernacularRoot
     * @property {number} 8 used
     * @property {number} 9 sortOrder
     * @property {Array.<string>} 10 parentIds
     */

    /**
     *
     * @type {Object.<string, RawTaxon>}
     */
    static rawTaxa;

    /**
     * @type {string}
     */
    id;

    /**
     *
     * @type {string}
     */
    nameString = '';

    /**
     *
     * @type {string}
     */
    canonical = '';

    /**
     *
     * @type {string}
     */
    hybridCanonical = '';

    /**
     *
     * @type {string}
     */
    acceptedEntityId = '';

    /**
     *
     * @type {string}
     */
    qualifier = '';

    /**
     *
     * @type {string}
     */
    authority = '';

    /**
     *
     * @type {string}
     */
    vernacular = '';

    /**
     *
     * @type {string}
     */
    vernacularRoot = '';

    /**
     * if set then the vernacular name should not be allowed for data entry
     *
     * @type {boolean}
     */
    badVernacular = false;

    /**
     * @type {boolean}
     */
    used;

    /**
     * @type {number}
     */
    sortOrder;

    /**
     *
     * @type {Array.<string>}
     */
    parentIds = [];

    /**
     *
     * @type {boolean}
     */
    static showVernacular = true;

    static setTaxa(taxa) {
        Taxon.rawTaxa = taxa;
    }

    /**
     *
     * @param {string} id
     * @returns {Taxon}
     * @throws {TaxonError}
     */
    static fromId (id) {
        if (!Taxon.rawTaxa) {
            throw new TaxonError(`Taxon.fromId() called before taxon list has been initialized.`);
        }

        if (!Taxon.rawTaxa.hasOwnProperty(id)) {
            throw new TaxonError(`Taxon id '${id}' not found.`);
        }

        const raw = Taxon.rawTaxa[id];

        const taxon = new Taxon;

        taxon.id = id;
        taxon.nameString = raw[0];
        taxon.canonical = raw[1] || raw[0]; // raw entry is blank if namesString == canonical
        taxon.hybridCanonical = raw[2] || taxon.canonical; // raw entry is blank if canonical == hybridCanonical
        taxon.acceptedEntityId = raw[3] || id;
        taxon.qualifier = raw[4];
        taxon.authority = raw[5];
        taxon.vernacular = raw[6];
        taxon.vernacularRoot = raw[7];
        taxon.used = raw[8];
        taxon.sortOrder = raw[9];
        taxon.parentIds = raw[10];

        if (raw[11]) {
            taxon.badVernacular = true
        }

        return taxon;
    }

    /**
     *
     * @param {boolean} vernacularMatched
     * @returns {string}
     */
    formattedHTML(vernacularMatched) {
        let acceptedTaxon;
        if (this.id !== this.acceptedEntityId) {
            acceptedTaxon = Taxon.fromId(this.acceptedEntityId);
        }

        if (Taxon.showVernacular) {
            if (vernacularMatched) {
                return (acceptedTaxon) ?
                    `<q class="taxon-vernacular">${escapeHTML(this.vernacular)}</q><wbr> <span class="italictaxon">${this.nameString}${this.qualifier ? ` <span class="taxon-qualifier">${this.qualifier}</span>` : ''}</span> <span class="taxauthority">${escapeHTML(this.authority)}</span>` +
                        ` = <span class="italictaxon">${acceptedTaxon.nameString}${acceptedTaxon.qualifier ? ` <span class="taxon-qualifier">${acceptedTaxon.qualifier}</span>` : ''}</span> <span class="taxauthority">${escapeHTML(acceptedTaxon.authority)}</span>`
                    :
                    `<q class="taxon-vernacular">${escapeHTML(this.vernacular)}</q><wbr> <span class="italictaxon">${this.nameString}${this.qualifier ? ` <span class="taxon-qualifier">${this.qualifier}</span>` : ''}</span> <span class="taxauthority">${escapeHTML(this.authority)}</span>`
                    ;
            } else {
                return (acceptedTaxon) ?
                    `<span class="italictaxon">${this.nameString}${this.qualifier ? ` <span class="taxon-qualifier">${this.qualifier}</span>` : ''}</span> <span class="taxauthority">${this.authority}</span>${this.vernacular ? ` <wbr><q class="taxon-vernacular">${escapeHTML(this.vernacular)}</q>` : ''
                        } = <span class="italictaxon">${acceptedTaxon.nameString}${acceptedTaxon.qualifier ? ` <span class="taxon-qualifier">${acceptedTaxon.qualifier}</span>` : ''}</span> <span class="taxauthority">${escapeHTML(acceptedTaxon.authority)}</span>`
                    :
                    `<span class="italictaxon">${this.nameString}${this.qualifier ? ` <span class="taxon-qualifier">${this.qualifier}</span>` : ''}</span> <span class="taxauthority">${escapeHTML(this.authority)}</span>${this.vernacular ? ` <wbr><q class="taxon-vernacular">${escapeHTML(this.vernacular)}</q>` : ''}`
                    ;
            }
        } else {
            return (acceptedTaxon) ?
                `<span class="italictaxon">${this.nameString}${this.qualifier ? ` <span class="taxon-qualifier">${this.qualifier}</span>` : ''}</span> <span class="taxauthority">${this.authority}</span>` +
                    ` = <span class="italictaxon">${acceptedTaxon.nameString}${acceptedTaxon.qualifier ? ` <span class="taxon-qualifier">${acceptedTaxon.qualifier}</span>` : ''}</span> <span class="taxauthority">${escapeHTML(acceptedTaxon.authority)}</span>`
                :
                `<span class="italictaxon">${this.nameString}${this.qualifier ? ` <span class="taxon-qualifier">${this.qualifier}</span>` : ''}</span> <span class="taxauthority">${escapeHTML(this.authority)}</span>`
                ;
        }
    }
}
