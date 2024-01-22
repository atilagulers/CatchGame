// NavigationUIController.js
// Version: 0.0.1
// Event: Lens Initialized
// Description: Controls position of a 3D object with a UI controller

// @ui {"label":"Make sure perspective Camera has"}
// @ui {"label":"Device Tracking Component."}
// @ui {"label":"Make sure to use Back Camera."}

// @ui {"widget":"separator"}
// @input SceneObject target {"label":"Move Target"}

// @ui {"widget":"separator"}
// @input bool hasMaxTravelDistance {"label":"Limit Movement"}
// @input int maxTravelDistance {"showIf":"hasMaxTravelDistance","label":"Movement Distance Limit"}
// @input int moveSpeed
// @input bool applyRotation

// @ui {"widget":"separator"}
//@input bool showDebugView

// @ui {"widget":"separator"}
// @input bool Advanced

// @ui {"widget":"group_start","label":"References", "showIf": "Advanced"}

// @ui {"widget":"separator"}
// @input Component.ScreenTransform distanceSymbol
// @input Component.Text distanceText

// @ui {"widget":"separator"}
// @input Component.ScreenTransform controlPlate
// @input Component.ScreenTransform controlDot

// @ui {"widget":"separator"}
// @input Component.Camera sceneCamera

// @ui {"widget":"group_end"}

var moveSpeed = script.moveSpeed;
var controlRadius = 2;
var maxDistanceFromCenter = script.maxTravelDistance;

var cameraTransform;
var targetTransform;
var originalTargetPosition;

var distanceSymbolAnchors = script.distanceSymbol.anchors;
var worldUp = vec3.up();
var worldForward = vec3.forward();
var manipulating;

var controlPos;
var centeringDot;
var orthoCamera;

// Enable full screen touches
global.touchSystem.touchBlocking = true;

// Allow double-tap to be passed through to Snapchat to flip the camera.
global.touchSystem.enableTouchBlockingException("TouchTypeDoubleTap", true);

initialize();

function initialize() {
    
    if (script.getSceneObject().getParent()) {
        var parent = script.getSceneObject().getParent();
        orthoCamera = parent.getComponent("Component.Camera") ;
        if (orthoCamera == null) {
            orthoCamera = parent.getParent().getComponent("Component.Camera") ? parent.getParent().getComponent("Component.Camera") : null;
        }
    }
    
    if (!orthoCamera) {
        print("NavigationUIController, ERROR: Please put me under an Ortho Camera");
        return;
    }
    
    
    if (!script.sceneCamera) {
        print("NavigationUIController, ERROR: Please assign Camera to Scene Camera input.");
        return;
    }
    
    if (!script.target) {
        print("NavigationUIController, ERROR: Please link a target object to Move Target input.");
        return;
    }
    
    cameraTransform = script.sceneCamera.getSceneObject().getTransform();
    targetTransform = script.target.getTransform();
    originalTargetPosition = targetTransform.getWorldPosition();    
    
    var updateEvent = script.createEvent("UpdateEvent");
    updateEvent.bind(onUpdate);
    
    var manipulatingEvent = script.createEvent("TouchStartEvent");
    manipulatingEvent.bind(onTouchStart);
    
    var manipulateMoveEvent = script.createEvent("TouchMoveEvent");
    manipulateMoveEvent.bind(onTouchMove);
    
    var manipulateEndEvent = script.createEvent("TouchEndEvent");
    manipulateEndEvent.bind(onTouchEnd);
    
    
}

function onUpdate(eventData) {
    if (manipulating) {
        if (controlPos) {
            var direction = controlPos.worldSpace;
            moveTargetObject(new vec3(direction.x, 0, direction.y));
        }
    } else {
        if (centeringDot) {
            centerControlDot();
        }
    }

    updateDistanceMarker();
    
}

//Touch events
function onTouchStart(eventData) {
    var touchPos = eventData.getTouchPosition();
    
    if (script.controlPlate.containsScreenPoint(touchPos)) {
        manipulating = true;
        moveControlDot(touchPos);
    }
}
function onTouchMove(eventData) {
    if (!manipulating) {
        return;
    }

    var touchPos = eventData.getTouchPosition();
    moveControlDot(touchPos);
}
function onTouchEnd(eventData) {
    if (!manipulating) {
        return;
    }
    manipulating = false;
    centeringDot = true;
}

//Moving control dot on screen
function moveControlDot(touchPos) {
    controlPos = getControlPosition(touchPos, controlRadius);
    script.controlDot.anchors.setCenter(controlPos.screenSpace);
}

//Get and convert position of control dot on screen (world and screen)
function getControlPosition(touchPos, radius) {
    var normalizedTouchPos = convertScreenPosition(touchPos);
    
    var localCenterpos = script.controlPlate.anchors.getCenter();
    var convertedCenterpos = script.controlPlate.getSceneObject().getParent().getComponent("Component.ScreenTransform").localPointToScreenPoint(localCenterpos);
    var normalizedCenterpos = convertScreenPosition(convertedCenterpos);

    // Convert to worldspace since screen space is affected by aspect ratio
    var touchWorldPos = orthoCamera.screenSpaceToWorldSpace(normalizedTouchPos, 1);
    var centerWorldPos = orthoCamera.screenSpaceToWorldSpace(normalizedCenterpos, 1);

    // If current pos is farther from center than radius, clamp it
    var distance = touchWorldPos.distance(centerWorldPos);
    var clampedWorldSpace = touchWorldPos;
    if (distance > radius) {
        clampedWorldSpace = centerWorldPos.moveTowards(touchWorldPos, radius);
        
    }
    
    var clampedScreenSpace = orthoCamera.worldSpaceToScreenSpace(clampedWorldSpace);
    var normalizedScreenSpace = convertScreenPositionReversed(clampedScreenSpace);
    var screenSpace = script.controlDot.screenPointToParentPoint(normalizedScreenSpace);

    return {
        screenSpace: screenSpace,
        worldSpace: clampedWorldSpace
            .sub(centerWorldPos)
    };
}

//Centering control dot after releasing tap
function centerControlDot() {
    var currentPos = script.controlDot.anchors.getCenter();    
    var targetPos = script.controlPlate.anchors.getCenter();   
    var distance = currentPos.distance(targetPos);
    if (distance > 0.001) {
        var nextPos = vec2.lerp(currentPos, targetPos, 0.2);
        script.controlDot.anchors.setCenter(nextPos);

    } else {
        centeringDot = false;
    }
}

//Moving target object based on controldot position
function moveTargetObject(direction) {
    var cameraDirection = cameraTransform.forward.projectOnPlane(worldUp);
      
    var rot = quat.rotationFromTo(worldForward, cameraDirection);
    var globalDirection = mat4.fromRotation(rot).multiplyDirection(direction);
        
    var pos = targetTransform.getWorldPosition();
    pos = pos.add(globalDirection.uniformScale(moveSpeed));
    if (script.hasMaxTravelDistance && (pos.distance(originalTargetPosition) > maxDistanceFromCenter)) {
        print("NavigationUIController: reach maximum navigation travel distance");
        return;
    }
    
    var rotDir = quat.lookAt(globalDirection.uniformScale(moveSpeed), worldUp);
    if (script.applyRotation) {
        targetTransform.setWorldRotation(rotDir);
    }
    targetTransform.setWorldPosition(pos);

}

function updateDistanceMarker() {
    var targetPos = script.target.getTransform().getWorldPosition();

    // Check if visible
    var rotationZ = cameraTransform.getWorldRotation().toEulerAngles().z;

    var distanceMarkerVisible = !(rotationZ > Math.PI * 0.9 && rotationZ < Math.PI * 1.1);
    script.distanceSymbol.getSceneObject().enabled = (distanceMarkerVisible && script.showDebugView);
    script.distanceText.getSceneObject().enabled = (distanceMarkerVisible && script.showDebugView);

    // Set it's position
    var screenSpaceRaw = script.sceneCamera.project(targetPos);
    var screenSpace = convertScreenPositionReversed(new vec2(screenSpaceRaw.x, screenSpaceRaw.y));
    var convertedScreenSpace = script.distanceSymbol.screenPointToParentPoint(screenSpace);
    distanceSymbolAnchors.setCenter(convertedScreenSpace);

    // Set the label
    var cameraPos = cameraTransform.getWorldPosition();

    // zero out the y to get flat distance
    cameraPos.y = 0;
    targetPos.y = 0;

    var distance = cameraPos.distance(targetPos) / 100; // in Meters
    script.distanceText.text = distance.toFixed(2);
}

//convert from a (0,1) space to (-1,1)
function convertScreenPosition(screenPos) {
    var x = (screenPos.x * 2) - 1;
    var y = 1 - (screenPos.y * 2);
    return new vec2(x, y);
}
//convert from a (-1,1) space to (0,1)
function convertScreenPositionReversed(screenPos) {
    var x = (screenPos.x + 1) / 2;
    var y = (1 - screenPos.y) / 2;
    return new vec2(x, y);
}
