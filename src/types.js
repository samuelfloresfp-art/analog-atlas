// Data shapes (JSDoc) — v2. No build step, so these are documentation + editor hints.
// Edit the JSON in src/data/ following these shapes.

/** @typedef {"moon"|"mars"} Planet */
/** @typedef {"landing"|"rover"|"base"} MissionId */
/** @typedef {"data"|"deduction"|"assumption"} Confidence */
/** @typedef {"strong"|"partial"|"weak"|"nodata"} Level */

/**
 * @typedef {Object} Mission            src/data/missions.json
 * @property {MissionId} id
 * @property {string} name
 * @property {string} accent            CSS color
 * @property {string} description
 * @property {Confidence} confidence
 */

/**
 * Attribute values are enum ids from criteria.json "enums".
 * @typedef {Object} Attributes
 * @property {string} topography
 * @property {string} slopeClass
 * @property {string} surface
 * @property {string} vegetation
 * @property {string} climate
 * @property {string} waterIce
 * @property {string} subsurface
 * @property {string} access
 * @property {string} isolation
 * @property {Confidence=} confidence   (sites only)
 */

/**
 * @typedef {Object} HistoryEntry
 * @property {Planet} planet
 * @property {MissionId} mission
 * @property {string} what
 * @property {string|null} org
 * @property {number|null} year
 * @property {{title:string,url?:string}|null} source   null -> card shows "Source pending"
 * @property {Confidence} confidence
 */

/**
 * @typedef {Object} Evidence
 * @property {string} dimension
 * @property {{dataset:string,value:number|null,unit:string}} earth
 * @property {{body:Planet,dataset:string,value:number|null,unit:string}} planet
 * @property {"verified"|"pending"} status   only "verified" may be shown as data-backed
 */

/**
 * @typedef {Object} Site               src/data/sites.json
 * @property {string} id
 * @property {string} name
 * @property {string} country
 * @property {string} continent
 * @property {number} lat
 * @property {number} lon
 * @property {string[]} environment
 * @property {"moon"|"mars"|"both"} target       kept for reference; NOT used by filters
 * @property {Partial<Record<Planet,string>>} mirrors
 * @property {string} summary
 * @property {Attributes} attributes
 * @property {HistoryEntry[]} history
 * @property {string} searchedOn                 date of the history search (YYYY-MM-DD)
 * @property {string[]} whyAnalog
 * @property {string[]} whatItLacks              never empty
 * @property {Record<string,Level>} dimensions   geology..operational
 * @property {Evidence[]} evidence
 * @property {Confidence} confidence
 * @property {string=} imageUrl
 * @property {{label:string,url?:string}[]} sources
 */

/**
 * @typedef {Object} Rule               src/data/criteria.json combos["<planet>.<mission>"].rules[]
 * @property {string} id
 * @property {string} label
 * @property {string} explanation
 * @property {string} field             attribute name, or "latitudeBand" (computed from lat)
 * @property {string[]} pass
 * @property {string[]} partial
 * @property {boolean} required         failing a required rule hides a site / makes a proposal "Not consistent"
 * @property {number} weight
 */

/**
 * @typedef {Object} Submission         src/data/community.json + localStorage
 * @property {string} id
 * @property {boolean=} example         team-created example, never counted
 * @property {string} createdAt
 * @property {string=} publishedAt
 * @property {string} nickname
 * @property {Object} form              explorer answers (see validate.js emptyForm)
 * @property {Object=} result           validation result (examples get a rules-only result at load time)
 */

/**
 * Output of validateCoordinates(lat, lon, opts?) — src/services/nasa/validate.js (Fase 3 – Prompt 1).
 * @typedef {"temp_range"|"aridity"|"vegetation"|"elevation"|"solar"|"wind"|"land_cover"|"data_coverage"|"radiation_gap"|"space_weather"} IndicatorKey
 * @typedef {"geology"|"terrain"|"atmosphere"|"temperature"|"water"|"biology"|"subsurface"|"operational"} Dimension
 * @typedef {Object} Indicator
 * @property {IndicatorKey} key
 * @property {Dimension} dimension
 * @property {number|string|null} value
 * @property {string=} unit
 * @property {Level} suggestedLevel            from data/nasa-endpoints.json thresholds (project rules)
 * @property {{name:string, agency:string, url:string, doi?:string}} source
 * @property {"live"|"cached"|"failed"} status
 * @property {Object=} details                 extra values (e.g. NDVI class, DONKI counts, ISS dose period)
 * @typedef {Object} ValidationReport
 * @property {number} lat
 * @property {number} lon
 * @property {string} checkedAt                ISO
 * @property {{inRange:boolean, onLand:boolean|null, nearestKnownSiteKm:number|null, nearestKnownSiteId:string|null, onLandSource?:string}} basic
 * @property {Indicator[]} indicators
 * @property {{ok:boolean, failingRequirements:string[], checked?:object[], planet?:Planet}=} missionFit
 * @property {{vegetation:string|null, climate:string|null}=} inferred   data-inferred criteria.json enum values
 * @property {string[]} errors
 */

export {};
