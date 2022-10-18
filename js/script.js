//UI elements
let generateMnemonic = document.getElementById("newMnemonic");
let sliderText = document.getElementById("sliderText");
let slider = document.getElementById("range");
let mnemonicText = document.getElementById("mnemonicText");
let hdPrivateKeyText = document.getElementById("hdPrivateKeyText");
let privateKeyText = document.getElementById("privateKeyText");
let publicKeyText = document.getElementById("publicKeyText");
let addressText = document.getElementById("addressText");
let qrcode = document.getElementById("qrModal");
let enterMnemonic = document.getElementById("enterMnemonic");

let num = 0;
let qrcodeNew = new QRCode("qrcode");
let address, addressQr, privateKey, publicKey, hdPrivateKey, words, mnemonic;

slider.oninput = function () {
  slider.innerHTML = this.value;
  num = this.value;
  derivationPath();
};

function generateQr() {
  addressQr = "bitcoin:" + address;
  qrcodeNew.makeCode(addressQr);
}

const randomMnemonic = function () {
  mnemonic = window.bsvMnemonic;
  words = mnemonic.fromRandom();
  mnemonicText.value = words.phrase.toString();
};

const hdPrivKeyFunc = function () {
  hdPrivateKey = bsv.HDPrivateKey.fromSeed(words.toSeed());
  hdPrivateKeyText.value = hdPrivateKey.toString();
};

const privateKeyFunc = function () {
  privateKey = hdPrivateKey.deriveChild(`m/44'/0'/${num}'`).privateKey;
  privateKeyText.value = privateKey.toString();
};

const publicKeyFunc = function () {
  publicKey = bsv.PublicKey.fromPrivateKey(privateKey);
  publicKeyText.value = publicKey.toString();
};

const addressFunc = function () {
  address = bsv.Address.fromPublicKey(publicKey).toString();
  addressText.value = address.toString();
};

const derivationPath = () => {
  privateKeyFunc();
  sliderText.innerHTML = `Choose derivation path... (m/44'/0'/${num}')`;

  publicKeyFunc();

  addressFunc();

  generateQr();

  refreshBalance();

  utxoUpdateUI();
};

const refreshBalance = function () {
  let config = {
    method: "get",
    url:
      `https://api.whatsonchain.com/v1/bsv/main/address/${address}/balance`,
  };
  axios(config).then((response) => {
    let data = JSON.stringify(response.data);
    console.log(data);
    let p = document.getElementById("balance");
    p.value = data;
  });
};

const getBalanceFromUtxos =  () => {
  let balance = 0
  allUtxos.forEach(e => {
    balance += e.satoshis
  })
  let p = document.getElementById("balance");
    p.value = balance;
}

const submitMnemonic = function () {
  try {
    words = bsvMnemonic.fromString(mnemonicText.value);
  } catch (err) {
    console.log(err);
    mnemonicText.style.outline = " solid red 1px";
    return;
  }

  mnemonicText.style.outline = "none";
  hdPrivKeyFunc();

  privateKeyFunc();

  publicKeyFunc();

  addressFunc();

  generateQr();

  refreshBalance();

  utxoUpdateUI();
};

generateMnemonic.addEventListener("click", function () {
  mnemonicText.style.outline = "none";
  randomMnemonic();

  hdPrivKeyFunc();

  privateKeyFunc();

  publicKeyFunc();

  addressFunc();

  num = 0;
  slider.value = 0;
  sliderText.innerHTML = `Choose derivation path... (m/44'/0'/${num}')`;
  address = addressText.value;

  generateQr();

  refreshBalance();

  utxoUpdateUI();
});

/*---------- Transaction Course Upgrade------------*/

//declare variables
let sendTransaction = document.getElementById("sendTransaction");
let sendTo = document.getElementById("sendToText");
let amount = document.getElementById("amountText");
let utxoAppend = document.getElementById("utxoAppend");
let loader = document.getElementById("loader");

let txid;
let txStatus;
let rawTX;
let allUtxos = [];
let utxoCombinedAmount = 0;
let txUtxos = [];
let openExplorer;

// refresh UI and update utxo data
const updateUtxo = function () {
  while (utxoAppend.firstChild) {
    utxoAppend.removeChild(utxoAppend.firstChild);
  }
  allUtxos.forEach(e => {
    const html = `
        <div id="${
          e.txid + e.vout
        }" style="display: flex; width: 100%">
    
          <div style="min-height: 50px; max-height: 50px; padding: 10px 0px; background-color: rgb(255, 165, 0, 0.3); min-width: 16%"><div style="padding: 10px">${
            e.satoshis
          }</div> </div>
    
          <div style="word-wrap: break-word; min-height: 50px; max-height: 50px; padding: 10px 0px; background-color: rgba(0, 255, 0, 0.3); min-width: 9%"><div style="padding: 10px">${
            e.vout
          }</div>
           </div>
    
          <div 
          style="word-wrap: break-word; min-height: 50px; max-height: 50px; padding:10px 0px; background-color: rgba(0, 0, 255, 0.3); cursor: pointer; min-width: 42%"><div style="padding: 10px">${
            e.txid
          }</div>
          </div>
    
          <div style="word-wrap: break-word; min-height: 50px; max-height: 50px; padding:10px 0px;  background-color: rgba(128,0,128,0.3); min-width: 33%"><div style="padding: 10px">${
            bsv.Script.buildPublicKeyHashOut(address).toHex()
          }</div>
            
           </div>
    
      </div> 
        `;
    utxoAppend.insertAdjacentHTML("beforeend", html);
  });
};

// animate utxo DIVs that are removed from utxo array
const animateUtxoDivs = function () {
  txUtxos.forEach((a)  => {
    let section = document.getElementById(
      a.txid + a.vout
    );
    section.style.color = "red";
    section.style.opacity = 0;
    section.style.transition = "opacity 3s linear 2.5s, color 1s linear 0s";
    setTimeout(() => {
      section.remove()
    }, 2000);
  });
};

// create function to update the UI with timeout to fetch data
const utxoUpdateUI = function () {
  setTimeout(() => {
    utxoData();
  }, 1000);
  setTimeout(() => {
    updateUtxo();
  }, 2500);
};

//successful transaction sequence for total UI update
const txSuccess = function () {
  setTimeout(() => {
    updateUtxo();
    getBalanceFromUtxos();
    setTimeout(() => {
      loader.style.visibility = "hidden";
      sendTransaction.disabled = false;
    }, 1000);
  }, 3000);
};

//////////////////////////////////////////////////////
/*------- Transaction course beginnning ------------*/
//////////////////////////////////////////////////////

// STEP 1
// GET utxo data from address - convert to transaction standard values

const utxoData = async () => { 
  let utxoData = await axios.get(`https://api.whatsonchain.com/v1/bsv/main/address/${address}/unspent`, {
  });
  utxoData.data.forEach(e => {
    allUtxos.push({
        txid: e.tx_hash,
        amount: e.value / 100000000, // convert to decimals
        script: bsv.Script.buildPublicKeyHashOut(address).toHex(),
        vout: e.tx_pos,
        satoshis : e.value
    })
  })
};

// STEP 2
// create function to see if the satoshis in the utxos are > send amount

const getUtxosForTransaction = async () => {
  utxoCombinedAmount = 0;
  txUtxos = [];
  let feeAmount = 50 // 2 outputs fees at 500 sats per Kb approx
  for(let i = 0; i < allUtxos.length; i ++ ){
    if (utxoCombinedAmount < parseInt(amount.value) + feeAmount) {
      let el = allUtxos[i];
      txUtxos.push(el);
      utxoCombinedAmount += el.satoshis;
      feeAmount += 74 // add one input fees at 500 sats per Kb approx
    } else {
      allUtxos.splice(0, i)
      console.log(allUtxos)
      break;
    }
    if(i === allUtxos.length -1){
      allUtxos = []
    }
  }
};

// STEP 3
// Add event listener for send button
sendTransaction.addEventListener("click", async function () {

  // STEP 4
  // build tx
  await getUtxosForTransaction();
  const tx = bsv.Transaction()
  tx.from(txUtxos)
  tx.to(sendTo.value, parseInt(amount.value))
  tx.change(address)
  tx.sign(privateKey)


  

// STEP 5
// broadcast and update UI
  try {   
      rawTX = tx.toString();
      loader.style.visibility = "visible";
      sendTransaction.disabled = true;
      animateUtxoDivs();
      await pushTx();


      // STEP 6
      // get change utxo 
      const txObject = tx.toObject()
      // check if there is a change UTXO if more than one output in transaction 
      if(txObject.outputs.length > 1){
        allUtxos.push({
          txid: txObject.hash,
          amount: txObject.outputs[1].satoshis / 100000000,
          script: txObject.outputs[1].script,
          vout: 1,
          satoshis : txObject.outputs[1].satoshis
        })
      }

      txSuccess();   
  } catch (e) {
    console.log(e);
    sendTo.style.outline = "red solid 1px";
  }
  
});

// STEP 7
// push tx
const pushTx = async () => {
  const res = await axios.post(
    "https://api.whatsonchain.com/v1/bsv/main/tx/raw",
    { txHex: rawTX },
    {
      headers: {
        "content-type": "application/json",
      },
    }
  );
  
  txid = res.data
  if(res.status === 200){
    txStatus = "Transaction Successful"
  }
  
  sentTxModal();
  openExplorer = function () {
    window.open(`https://whatsonchain.com/tx/${txid}`);
  };
};

//STEP 8
// transaction success pop up modal

function sentTxModal() {
  const d = new Date();
  let time = d.getTime(); 
  Swal.fire(
    "Payment sent",
    `<div style="margin-top: 20px">timestamp: ${time} </div> <br> <div onclick="openExplorer()" style="cursor: pointer; color: blue">txid: ${txid} </div> <br> <div>Status: ${txStatus}</div>`,
    "success"
  );
}

/*------- Transaction course end ------------*/
