/* 
 create a local fork of any evm mainnet<bsc tried> using anvil 
 simulate the pancake v3 swap transaction on it by running this code snippet,
 and use the trace_transaction rpc method for getting the trace.
*/

const web3 = require("web3");
const axios = require('axios');
const v3_abi = require("./v3Router.json");
// const mainnet = "https://burned-responsive-choice.bsc.quiknode.pro/<>/";
// const testnet = "https://data-seed-prebsc-1-s1.binance.org:8545";
// const polygon_zkevm = "https://zkevm-rpc.com";
const connection = new web3("http://127.0.0.1:8545"); // evm Fork using anvil(foundr)/ganache etc
const swapper_mainnet_address = "0x1b81D678ffb9C0263b24A97847620C99d213eB14"; // pancakev3 swap router address
const contract = new connection.eth.Contract(v3_abi, swapper_mainnet_address);


async function swap() {

    let value = 0;
    let amountIn = "10000000000000000000"; // Input token amount
    let amountOutMin = 0;

    let data = contract.methods.exactInputSingle({
        "tokenIn": "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c",
        "tokenOut": "0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82",
        "fee": "10000",
        "recipient": "0x8103683202aa8DA10536036EDef04CDd865C225E",
        "deadline": "1911437753",
        "amountIn": amountIn,
        "amountOutMinimum": "0",
        "sqrtPriceLimitX96": "0",
    }).encodeABI(); // enough for erc<>erc swap

    const ERC_ETH = false;  // for getting eth in response instead of weth
    const ETH_ERC = true; // For using ETH to swap
    if (ERC_ETH || ETH_ERC) {
        const multicall = [];
        multicall.push(data);
        if (ETH_ERC) {
            const refundEth = contract.methods.refundETH().encodeABI();
            multicall.push(refundEth);
            value = amountIn;
        } else if (ERC_ETH) {
            const unwrapEth = contract.methods.unwrapWETH9(amountOutMin.toString() || 0, "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266").encodeABI();
            multicall.push(unwrapEth);
            value = '0';
        }
        data = await connection.eth.abi.encodeParameters(
            ["bytes[]",],
            [multicall]
        );
        data = "0xac9650d8" + data.slice(2);
    };

    const tx = {
        from: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
        to: swapper_mainnet_address,
        data,
        gas: "2000000",
        value,
    }
    console.log("swapTx:  ", tx);
    // return;

    const signedTX = await connection.eth.accounts.signTransaction(tx, "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80").then(tx => tx.rawTransaction); // fork private key don't use it
    // console.log(signedTX);
    if (signedTX) {
        const txHash = await connection.eth.sendSignedTransaction(signedTX?.toString());
        console.log(txHash);
        await trace(txHash.transactionHash);
    }
};

async function trace(txHash) {
    let data = JSON.stringify({
    "method": "trace_transaction",
    "params": [
        `${txHash}`
    ],
    "id": 1,
    "jsonrpc": "2.0"
    });

    let config = {
    method: 'post',
    maxBodyLength: Infinity,
    url: 'http://127.0.0.1:8545/', // Erigon / OpenEthereum
    headers: { 
        'Content-Type': 'application/json'
    },
    data : data
    };

    axios.request(config)
    .then((response) => {
    console.log(response.data);
    })
    .catch((error) => {
    console.log(error);
    });
}

swap();

