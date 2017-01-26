const request = require('request'),
    q = require('q');

class GenericAkinatorResponse {
    constructor(json) {
        this.json = json;
    }
    get wasSuccessful() {
        return this.json && this.json.completion == "OK";
    }
    get errorCode() {
        return this.json.completion;
    }
}

class AkinatorQuestionResponse extends GenericAkinatorResponse {
    constructor(json) {
        super(json);
    }
    get question() {
        if(this.json.parameters.step_information) {
            return this.json.parameters.step_information.question;
        }else{
            return this.json.parameters.question;
        }
    }
    get isLast() {
        // console.log("progression", this.json.parameters.progression);
        return this.json.parameters.progression > 98;
    }
}

class AkinatorCharacterResponse extends GenericAkinatorResponse {
    constructor(json) {
        super(json);
    }
    get result() {
        return this.json.parameters.elements[0].element;
    }
    get hasResult() {
        return this.json.parameters.elements.length > 0;
    }
}

class Akinator {
    constructor() {
        this.baseUrl = "http://api-en4.akinator.com/ws/";
    }
    setApiHost(baseUrl) {
        this.baseUrl = baseUrl;
    }
    _getAkinatorQuestionResponse(defer, error, response, body) {
        if(error) {
            console.log("Akinator API error", error);
            defer.reject(error);  
        }else{
            const json = JSON.parse(body);
            const responseObj = new AkinatorQuestionResponse(json);
            if(responseObj.wasSuccessful) {
                defer.resolve(responseObj);
            }else{
                console.log("Akinator API error in response", body);
                defer.reject(responseObj.errorCode);
            }
        }
    }
    _getAkinatorCharacterResponse(defer, error, response, body) {
        if(error) {
            console.log("Akinator API error", error);
            defer.reject(error);  
        }else{
            const json = JSON.parse(body);
            const responseObj = new AkinatorCharacterResponse(json);
            if(responseObj.wasSuccessful) {
                defer.resolve(responseObj);
            }else{
                console.log("Akinator API error in response", body);
                defer.reject(responseObj.errorCode);
            }
        }
    }
    start() {
        const defer = q.defer();
        request(this.baseUrl + "new_session?partner=1&player=alexa", (error, response, body) => {
            return this._getAkinatorQuestionResponse(defer, error, response, body);
        });
        return defer.promise;
    }
    sendAnswer(answer, session, signature, step) {
        const defer = q.defer();
        request(this.baseUrl + "answer?session=" + session + "&signature=" + signature + "&step=" + step + "&answer=" + answer, (error, response, body) => {
            return this._getAkinatorQuestionResponse(defer, error, response, body);
        })
        return defer.promise;
    }
    getQuestion(session, signature, step) {
        return this.sendAnswer(null, session, signature, step);
    }
    getResult(session, signature, step) {
        const defer = q.defer();
        const url = this.baseUrl + "list?session=" + session + "&signature=" + signature + "&step=" + step + "&size=1&max_pic_width=246&max_pic_height=294&pref_photos=VO-OK&mode_question=0";
        request(url, (error, response, body) => {
            return this._getAkinatorCharacterResponse(defer, error, response, body);
        })
        return defer.promise;
    }
    wrongResult(session, signature, step) {
        const defer = q.defer();
        request(this.baseUrl + "exclusion?session=" + session + "&signature=" + signature + "&step=" + step + "&forward_answer=1", (error, response, body) => {
            return this._getAkinatorQuestionResponse(defer, error, response, body);
        })
        return defer.promise;
    }
    correctResult(session, signature, step) {
        const defer = q.defer();
        request(this.baseUrl + "choice?session=" + session + "&signature=" + signature + "&step=" + step, (error, response, body) => {
            if(error) {
                console.log("Akinator API error", error);
                defer.reject(error);  
            }else{
                defer.resolve(true);
            }
        })
        return defer.promise;
    }
}

module.exports = new Akinator();