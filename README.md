# (Unofficial) Akinator skill for Amazon Alexa

This skill allows you to play [Akinator](http://www.akinator.com) with Alexa. Say `Alexa, ask me who I'm thinking of` or `Alexa, start Akinator` and she'll start asking you questions which you can answer with yes, no, don't know, probably and probably not.

It's available in German and English and is basically just a proxy between Alexa and the Akinator API. 

## How to run it

It's recommended to use [alexa-app-server](https://github.com/alexa-js/alexa-app-server) to run it.

1. Go into the `apps` directory of alexa-app-server
2. Clone this repository (so that you have `/apps/akinator-skill/index.js`)
3. run `/apps/akinator-skill/npm install`
4. Launch alexa-app-server. It will automatically detect the skill and it will be available under the HTTP endpoint `/skills/akinator` by default.

## Where do I find the interaction model?

1. Edit `index.js` and uncomment the `localization.setLocale` method of the language of the interaction model which you want to generate.
2. Run alexa-app-server
3. Open `/skills/akinator?slots` in your browser
