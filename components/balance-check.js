"use strict";

//Get addresses from textarea
let textArea = document.getElementById('BalanceChecker');

if (window.localStorage["TextEditorData"]) {
  textArea.value = window.localStorage["TextEditorData"];
}
textArea.addEventListener("keyup", function () {
  window.localStorage["TextEditorData"] = textArea.value;
});
let addressesList = textArea.value.split("\n");

// Get Bitcoin Price
async function getBtcPrice() {
  try {
    try {
      const response = await fetch('https://bitcoindata.science/api/priceusd.json');
      const data = await response.json();
      let btcPrice = data.price;
      return btcPrice
    }
    catch (error) {
      console.warn('bitcoindata API failed - ' + error)
      const response = await fetch("https://api.coindesk.com/v1/bpi/currentprice/BRL.json");
      const data = await response.json();
      let btcPrice = data.bpi.USD.rate_float;
      return btcPrice;
    }
  }
  catch (error) {
    console.warn(error)
  }
};

// Get Address Balance
let balance = [];
const outputArea = document.getElementById("balances")

async function getAddressBalance(address, price, balancearray) {
  try {
    try {
      const response = await fetch('https://mempool.space/api/address/' + address);
      const data = await response.json();
      balancearray.push({
        address: address,
        balance: (data.chain_stats.funded_txo_sum - data.chain_stats.spent_txo_sum) / 100000000,
        value: (data.chain_stats.funded_txo_sum - data.chain_stats.spent_txo_sum) / 100000000 * price,
        unconfirmed: (data.mempool_stats.funded_txo_sum - data.mempool_stats.spent_txo_sum) / 100000000,
        unconfirmed_value: (data.mempool_stats.funded_txo_sum - data.mempool_stats.spent_txo_sum) / 100000000 * price,
      })
    }
    catch (error) {
      console.warn('Mempool API failed - ' + error)
      const response = await fetch('https://api.blockcypher.com/v1/btc/main/addrs/' + address + '/balance');
      const data = await response.json();
      balancearray.push({
        address: address,
        balance: data.balance / 100000000,
        value: data.balance / 100000000 * price,
        unconfirmed: data.unconfirmed_balance,
        unconfirmed_value: data.unconfirmed_balance * price,
      }
      )
    }
  }
  catch (error) {
    console.warn(error)
  }
};


// Declare a function that returns a promise that resolves after a given time
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Declare an async function that waits for a delay and then calls another async function
async function getBalances(price) {
  balance = [];
  modalText = {}
  for (const i of addressesList) {
    // Use await with the delay function
    await delay(500);
    // Call the async function
    await getAddressBalance(i, price, balance);
  }
  document.getElementById("submit").innerHTML = 'Get Balance!'
  document.getElementById("submit").disabled = false;

  outputArea.innerHTML = `
    <div class="bg-body-tertiary rounded border p-3 my-3 mt-5 row">
       <div class="col-md-6 text-primary-emphasis">Total number of addresses: ${balance.length}</div>
       <div class="w-100 d-none d-xs-block"></div>
       <div class="col col-md-3 pe-0">${balance.reduce((a, e) => a + e.balance, 0).toLocaleString(undefined, { minimumFractionDigits: 8, maximumFractionDigits: 8 })} BTC</div>
       <div class="col col-md-3 pe-0">${balance.reduce((a, e) => a + e.value, 0).toLocaleString("en-US", { style: "currency", currency: "USD" })}</div>
    </div>

    <p class="h6">Detailed Results</p>
    ${balance.map(i => `
     <div class="bg-body-tertiary rounded border p-3 my-3 row">
      <div class="row">
       <div class="col-md-6"><code><a target="_blank" rel="noreferrer" title="${i.address}" href="https://mempool.space/address/${i.address}">${i.address}</a></code></div>
        <div class="w-100 d-none d-xs-block"></div>
        <div class="col col-md-3 pe-0">${i.balance.toLocaleString(undefined, { minimumFractionDigits: 8, maximumFractionDigits: 8 })} BTC</div>
        <div class="col col-md-3 pe-0">${i.value.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</div>
      </div>
      ${i.unconfirmed !== 0 ? `
       <div class="row">
       <div class="col-md-6"><code class="text-warning-emphasis">unconfirmed</code></div>
        <div class="w-100 d-none d-xs-block"></div>
        <div class="col col-md-3 pe-0 text-warning-emphasis">${i.unconfirmed.toLocaleString(undefined, { minimumFractionDigits: 8, maximumFractionDigits: 8 })} BTC</div>
        <div class="col col-md-3 pe-0 text-warning-emphasis">${i.unconfirmed_value.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</div>
       </div>` : ''}
      </div>
   `).join('')}
  `
}

function handleClick() {
  document.getElementById("submit").innerHTML = '<span class="spinner-border spinner-border-sm me-3" role="status" aria-hidden="true"></span>Loading...'
  document.getElementById("submit").disabled = true;
  balance = [];
  addressesList = [];
  textArea = document.getElementById('BalanceChecker');
  addressesList = textArea.value.split("\n");
  addressesList = addressesList.filter(n => n);
  getBtcPrice().then(price => getBalances(price))
}

// Update Address Balance
let newBalance = [];
let modalText = {};

const modal = new bootstrap.Modal(document.getElementById("modal"), {});

async function compareBalance(price) {
  newBalance = [];
  for (const i of addressesList) {
    await delay(500);
    await getAddressBalance(i, price, newBalance)
  };
  for (let i in balance) {
    if (balance[i].balance !== newBalance[i].balance) {
      modalText = {
        address: newBalance[i].address,
        balance: newBalance[i].balance,
        value: newBalance[i].value,
        color: "",
        title: "New confirmed transaction",
        body: "Transaction confirmed"
      };
    }
    else if (balance[i].unconfirmed !== newBalance[i].unconfirmed) {
      modalText = {
        address: newBalance[i].address,
        balance: newBalance[i].unconfirmed,
        value: newBalance[i].unconfirmed_value,
        color: "text-warning-emphasis",
        title: "Incoming transaction",
        body: "Transaction not confirmed yet"
      };
    }
  }
  document.querySelector('.modal-title').innerHTML = modalText.title;
  document.querySelector('.modal-address').innerHTML = modalText.address;
  document.querySelector('.modal-balance').innerHTML = modalText.balance;
  document.querySelector('.modal-value').innerHTML = modalText.value.toLocaleString("en-US", { style: "currency", currency: "USD" });
  document.getElementById('modal-body-text').className = modalText.color;

  if (Object.keys(modalText).length){
    modal.show()
  }
  return modalText;
};

if (!Array.isArray(balance) || !balance.length) {
  var timerCompareBalance = setInterval(() => {
  getBtcPrice().then(price => compareBalance(price));
}, 300000)
}