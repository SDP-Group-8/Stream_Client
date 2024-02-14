var peer = null;
let sdp = "";

async function getOffer() {
    const response = await fetch("http://172.20.167.248:8000/request-offer",
        {
            method: "get",
            headers: {
                'Content-Type': 'text/plain'
            }
        })
    const connection_offer = response.json()
    createPeer(connection_offer.sdp)
}

function createPeer (sdp) {
    const config = {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' }
        ]
    };
    
    peer = new RTCPeerConnection(config);
    
    captureCamera(sdp);
}

async function showDevices() {    
    let devices = (await navigator.mediaDevices.enumerateDevices()).filter(i => i.kind == 'videoinput')
}

function captureCamera (sdpOffer) {
    let constraints = {
        audio: false,
        video: true
    }; 

    navigator.mediaDevices.getUserMedia(constraints).then(function(stream) {
        stream.getTracks().forEach(function(track) {

            applyContraints(track);

            peer.addTrack(track, stream);            
        });
        return createAnswer(sdpOffer);
    }, function(err) {
        alert('Could not acquire media: ' + err);
    });
}


async function createAnswer (sdp) {
    let offer = new RTCSessionDescription({sdp: sdp, type: 'offer'});
    await peer.setRemoteDescription(offer);
    let answer = await peer.createAnswer();

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
    if (videoTrack) {
    
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
}

async function waitToCompleteIceGathering(pc, logPerformance) {
    const t0 = performance.now()
  
    let p = new Promise((resolve) => {
      setTimeout(function () {
        resolve(pc.localDescription)
      }, 2500)
      pc.onicegatheringstatechange = (ev) =>
        pc.iceGatheringState === "complete" && resolve(pc.localDescription)
    })
  
    return p
  }

function sendAnswerToBrowser(sdp, type) {
    fetch("http://172.20.167.248:8000/answer", {
        method: "post",
        headers: {
            'Content-Type': 'text/plain'
        },
        body: {"sdp": sdp, "type": type}
    })
}

getOffer()