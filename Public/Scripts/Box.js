// -----JS CODE-----
//@input Component.ScriptComponent armScript

const armAPI = script.armScript.api

function onTapCatch(){
    armAPI.startCatching()
}

script.createEvent('TapEvent').bind(async function(){
    onTapCatch();
});
