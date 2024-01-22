// -----JS CODE-----

const armObj = script.getSceneObject();
const armTrans = armObj.getTransform()
const lowerHeight = -10
const higherHeight = armTrans.getWorldPosition().y
const moveSpeed =  1.5

script.api.startCatching = startCatching

async function startCatching() {
    await goDown();
    await catchObject();
    await goUp();
}

function goDown() {
    return new Promise((resolve) => {
        print('GO DOWN');
        let targetPos = armTrans.getWorldPosition()
        targetPos.y = lowerHeight
        const speed = moveSpeed * getDeltaTime()
        
        moveTo(targetPos, speed, resolve)
    });
}

function catchObject() {
    return new Promise((resolve) => {
        print('CATCHING');
        resolve();
    });
}

function goUp() {
    return new Promise((resolve) => {
        print('GO UP');
        let targetPos = armTrans.getWorldPosition()
        targetPos.y = higherHeight
        const speed = moveSpeed * getDeltaTime()
        
        moveTo(targetPos, speed, resolve)
    });
}

function moveTo(targetPos, speed, cb){
    const tempUpdate = script.createEvent('UpdateEvent')
    tempUpdate.bind(function(){
        const currArmPos = armTrans.getWorldPosition()
        const lerp = vec3.lerp(currArmPos, targetPos, speed)
        
        armTrans.setWorldPosition(lerp)
        
        if (targetPos.distance(currArmPos) <= 1) {
            cb()
            script.removeEvent(tempUpdate)
        }
    })
}

