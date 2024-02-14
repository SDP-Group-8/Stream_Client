async function getOffer() {
    const response = await fetch("http://172.20.167.248:8000/request-offer",
        {
            method: "get",
            headers: {
                'Content-Type': 'text/plain'
            }
        })
    const connection_offer = response.json()
    createPeer(connection_offer.sdp, connection_offer.type)
}

function createPeer (sdp, type) {
    const config = {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' }
        ]
    };
    
    const peer = new RTCPeerConnection(config);
    
    captureCamera(sdp, type, peer);
}

async function showDevices() {    
    let devices = (await navigator.mediaDevices.enumerateDevices()).filter(i => i.kind == 'videoinput')
}

function captureCamera (sdp, type, peer) {
    let constraints = {
        audio: false,
        video: true
    }; 

    navigator.mediaDevices.getUserMedia(constraints).then(function(stream) {
        stream.getTracks().forEach(function(track) {

            applyContraints(track);

            peer.addTrack(track, stream);            
        });
        return createAnswer(sdp, type, peer);
    }, function(err) {
        alert('Could not acquire media: ' + err);
    });
}


async function createAnswer (sdp, type, peer) {
    const offer = new RTCSessionDescription({sdp: sdp, type: type});
    await peer.setRemoteDescription(offer);
    const answer = await peer.createAnswer();

    await peer.setLocalDescription(answer);
    await new Promise(resolve => {
        if (peer.iceGatheringState === 'complete') {
            resolve();
        } else {
            const checkState = () => {
                if (peer.iceGatheringState === 'complete') {
                    peer.removeEventListener('icegatheringstatechange', checkState);
                    resolve();
                }
            };
            peer.addEventListener('icegatheringstatechange', checkState);
        }
    });

    sendAnswerToBrowser(peer.localDescription.sdp, peer.localDescription.type);
}

function applyContraints (videoTrack) {
    const videoConstraints = {
        width: { min: 320, max: 1280 },
        height: { min: 240,  max: 720 },
        frameRate: {min: 15,  max: 30 }
    };

    // Apply video track constraints
    videoTrack.applyConstraints(videoConstraints)
        .then(() => {
            console.log("Video track constraints applied successfully");
        })
        .catch((error) => {
            console.error("Error applying video track constraints:", error);
            setTimeout(() => {
                applyContraints();
            }, 5000);
        });

    // Set content hint to 'motion' or 'detail'
    videoTrack.contentHint = 'motion';
}

function sendAnswerToBrowser(sdp, type) {
    fetch("http://172.20.167.248:8000/answer", {
        method: "post",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({"sdp": sdp, "type": type})
    })
}

getOffer()