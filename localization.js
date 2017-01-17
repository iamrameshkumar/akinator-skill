var requireUncached = function(module) {
  delete require.cache[require.resolve(module)];
  return require(module);
}

class Localization {
    constructor() {
        this._languageFileMap = {
            'de-DE': './locale/de.json',
            'en-US': './locale/en.json',
            'en-GB': './locale/en.json'
        };
        this._languageDataMap = {};
        this.locale = "de-DE";
    }
    setLocale(key) {
        this.locale = key;
        this.loadLanguage(key);
    }
    loadLanguage(key) {
        if(key in this._languageDataMap) {
           return;
        }
        if(!key in this._languageFileMap) {
            throw new Exception("Didn't find language");
        }
        this._languageDataMap[key] = requireUncached(this._languageFileMap[key]);
    }
    translateResponse(key) {
        return this._languageDataMap[this.locale].responses[key];
    }
    getDataElement(key) {
        return this._languageDataMap[this.locale].data[key];
    }
    getUtterances(intent) {
        return this._languageDataMap[this.locale].utterances[intent];
    }
}

module.exports = new Localization();