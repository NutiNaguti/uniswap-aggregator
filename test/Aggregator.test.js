const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");
const helpers = require("@nomicfoundation/hardhat-network-helpers");

describe("Aggregator tests", () => {
    let Aggregator;
    let aggregator;

    // BUSD 0x55d398326f99059fF775485246999027B3197955
    // DAI  0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3
    // DOGE 0xbA2aE424d960c26247Dd6c32edC70B295c744C43
    // ADA  0x3EE2200Efb3400fAbB9AacF31297cBdD1d435D47
    // AAVE 0xfb6115445Bff7b52FeB98650C87f44907E58f802
    // BTT  0x8595F9dA7b868b1822194fAEd312235E43007b49
    // LINK 0xF8A0BF9cF54Bb92F17374d9e9A321E6a111a51bD
    // LTC  0x4338665CBB7B2485A8855A139b75D5e34AB0DB94

    const BUSD_ADDRESS = "0x55d398326f99059fF775485246999027B3197955";
    const LTC_ADDRESS  = "0x4338665CBB7B2485A8855A139b75D5e34AB0DB94";

    const ERC20ABI = require('./abi/ERC20.json');
    const BUSD_AMOUNT = ethers.BigNumber.from("100000000000000000");
    const DEADLINE_DURATION = 30;

    beforeEach(async () => {
        const routers = [
            // sushi
            "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506",
            // pancake
            "0x10ED43C718714eb63d5aA57B78B54704E256024E",
            // bsw
            "0x3a6d8cA21D1CF76F653A67577FA0D27453350dD8",
            // bakery
            "0xCDe540d7eAFE93aC5fE6233Bee57E1270D3E330F",
            // baby
            "0x325E343f1dE602396E256B67eFd1F61C3A6B38Bd"
        ]

        Aggregator = await ethers.getContractFactory("Aggregator");
        aggregator = await Aggregator.deploy(routers, DEADLINE_DURATION);
        [owner, address1] = await ethers.getSigners();
    });

    xit("Test quote", async () => {
        await aggregator.quote(BUSD_AMOUNT, BUSD_ADDRESS, LTC_ADDRESS);
    });

    it("Test swap", async () => {
        let quote = await aggregator.quote(BUSD_AMOUNT, BUSD_ADDRESS, LTC_ADDRESS);
        console.log("amountOut: ", quote.amountOut);

        // BUSD holder 
        let address = "0x4b16c5de96eb2117bbe5fd171e4d203624b014aa";
        await helpers.impersonateAccount(address);
        let impersonatedSigner = await ethers.getSigner(address);

        // transfer BUSD 
        let provider = ethers.provider;
        let BUSD = new ethers.Contract(BUSD_ADDRESS, ERC20ABI, provider);
        let LTC = new ethers.Contract(LTC_ADDRESS, ERC20ABI, provider);
        await BUSD.connect(impersonatedSigner).transfer(address1.address, BUSD_AMOUNT);

        // swap tokens
        console.log("balance in BUSD: ", await BUSD.balanceOf(address1.address));
        await BUSD.connect(address1).approve(aggregator.address, BUSD_AMOUNT);
        await aggregator.connect(address1).swap(BUSD_AMOUNT, quote.amountOut, quote.routerAddress, [BUSD_ADDRESS, LTC_ADDRESS])
        console.log("balance in LTC: ", await LTC.balanceOf(address1.address));
    });
});