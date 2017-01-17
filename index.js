var alexa = require('alexa-app');
var akinator = require('./akinator');
var localization = require('./localization');

// enable the language which you need the generated interaction model:
localization.setLocale("en-US");
// localization.setLocale("de-DE");
// localization.setLocale("en-GB");

module.change_code = 1;

const translate = localization.translateResponse.bind(localization);

const startGame = (request, response) => {
    akinator.start().then(akinatorResponse => { 
        updateSession(akinatorResponse, request, response);
        response.say(akinatorResponse.question);
        response.send();
    }, error => {
        response.fail(translate("COULD_NOT_START_GAME"));
        response.send();
    });
    return false;  
}

const extractRequestSignature = request => {
    const session = request.getSession();
    const sessionId = session.get("session");
    const signature = session.get("signature");
    const step = session.get("step");
    if(sessionId == undefined || signature == undefined || step == undefined) {
        return false;
    }
    return {
        session: sessionId,
        signature: signature,
        step: step
    };
}

const updateSession = (akinatorResponse, request, response) => {
    const session = request.getSession();
    if(akinatorResponse.json.parameters.identification) {
        session.set("session", akinatorResponse.json.parameters.identification.session);
        session.set("signature", akinatorResponse.json.parameters.identification.signature);
    }
    if(akinatorResponse.json.parameters.step_information) {
        session.set("step", akinatorResponse.json.parameters.step_information.step);
    }else{
        session.set("step", akinatorResponse.json.parameters.step);
    }
    response.shouldEndSession(false);
}

const buildCharacterCard = (akinatorCharacterResponse) => {
    const result = akinatorCharacterResponse.result;
    const card = {
        type: "Standard",
        title: result.name,
        text: result.description
    };
    // This does currently not work as the images are not delivered via HTTPS
    // if(result.absolute_picture_path) {
    //     card.image = { 
    //         smallImageUrl: result.absolute_picture_path
    //     };
    // }
    return card;
}

const sendAnswer = (request, response, answer) => {
    const state = extractRequestSignature(request);
    if(state === false) {
        response.fail(translate("COULD_NOT_START_GAME"));
        response.send();
    }else{
        akinator.sendAnswer(answer, state.session, state.signature, state.step).then(akinatorResponse => {
            speakAnswer(akinatorResponse, state, request, response);
        }, error => {
            response.fail(translate("ERROR_SERVER_CONNECTION"));
            response.send();
        });
    }
    return false;
}

const speakAnswer = (akinatorResponse, state, request, response) => {
    updateSession(akinatorResponse, request, response);
    if(akinatorResponse.isLast) {
        sendResult(state, akinatorResponse, request, response);
    }else{
        response.say(akinatorResponse.question);
        response.send();
    }
}

const sendResult = (state, akinatorResponse, request, response) => {
    state.step++; //if we come this far, we need to add a step
    request.getSession().set("step", state.step);
    akinator.getResult(state.session, state.signature, state.step).then(akinatorResponse => {
        if(akinatorResponse.hasResult) {
            response.card(buildCharacterCard(akinatorResponse));
            response.say(translate("ANSWER_FOUND").replace("{0}", akinatorResponse.result.name));
            request.getSession().set("justFoundResult", true); //we store this state as we also want to be able to reply with "yes"
            response.send();
        }else{
            console.log("we checked for results, but couldn't find any...?");
            response.say(akinatorResponse.question);
            response.send();
        }
    }, error => {
        console.log("There was an error getting the result", error);
        response.say(akinatorResponse.question);
        response.send();
    });
}

const correctResult = (request, response) => {
    const state = extractRequestSignature(request);
    if(state === false) {
        response.fail(translate("COULD_NOT_START_GAME"));
        response.send();
    }else{
        akinator.correctResult(state.session, state.signature, state.step).then(akinatorResponse => {
            var session = request.getSession();
            session.clear();
            response.say(translate("END_SESSION_CORRECT_RESULT"));
            response.send();
        }, error => {
            response.fail(translate("ERROR_SERVER_CONNECTION"));
            response.send();
        });
    }
    return false;
}

const wrongResult = (request, response) => {
    const state = extractRequestSignature(request);
    if(state === false) {
        response.fail(translate("COULD_NOT_START_GAME"));
        response.send();
    }else{
        akinator.wrongResult(state.session, state.signature, state.step).then(akinatorResponse => {
            speakAnswer(akinatorResponse, state, request, response);
        }, error => {
            response.fail(translate("ERROR_SERVER_CONNECTION"));
            response.send();
        });
    }
    return false;
}

const endGame = (request, response) => {
    var session = request.getSession();
    session.clear();
    response.say(translate("END_SESSION"));
};

const buildIntentDescription = (intent) => {
    return {
        "slots": {},
        "utterances": localization.getUtterances(intent),
    };
}

var app = new alexa.app("akinator");

app.pre = (request, response, type) => {
    localization.setLocale(request.data.request.locale);
    akinator.setApiHost(localization.getDataElement("akinatorApiHost"));
}
app.launch(startGame);
app.intent("StartGameIntent", buildIntentDescription("StartGameIntent"), startGame);
app.intent("AnswerYesIntent", buildIntentDescription("AnswerYesIntent"), (request, response) => {
    if(request.getSession().get("justFoundResult") === true) {
        request.getSession().clear("justFoundResult");
        return correctResult(request, response);
    }else{
        return sendAnswer(request, response, 0);
    }
});
app.intent("AnswerNoIntent", buildIntentDescription("AnswerNoIntent"), (request, response) => {
    if(request.getSession().get("justFoundResult") === true) {
        request.getSession().clear("justFoundResult");
        return wrongResult(request, response);
    }else{
        return sendAnswer(request, response, 1);
    }
});
app.intent("AnswerDontKnowIntent", buildIntentDescription("AnswerDontKnowIntent"), (request, response) => sendAnswer(request, response, 2));
app.intent("AnswerMaybeIntent", buildIntentDescription("AnswerMaybeIntent"), (request, response) => sendAnswer(request, response, 3));
app.intent("AnswerMaybeNotIntent", buildIntentDescription("AnswerMaybeNotIntent"), (request, response) => sendAnswer(request, response, 4));
app.intent("EndGameIntent", buildIntentDescription("EndGameIntent"), endGame);
app.intent("AMAZON.HelpIntent", (request, response) => {
    response.say(translate("HELP"));
})

app.error = (exception, request, response) => {
    console.log("global error", exception);
    response.say(translate("ERROR"));
    throw exception;
};

app.sessionEnded((request, response) => {
    console.log("session ended");
    var session = request.getSession();
    session.clear();
});

module.exports = app;