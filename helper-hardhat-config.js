//helps us define when to use what address depending on what network/chain you are on
const networkConfig = {
    31337: {
        name: "localhost",
    },
    // Price Feed Address, values can be obtained at https://docs.chain.link/docs/reference-contracts
    // Default one is ETH/USD contract on Kovan
    42: {
        name: "kovan", 
        ethUsdPriceFeed: "0x9326BFA02ADD2366b30bacB125260Af641031331", 
    },
    4: {
        name: "rinkeby",
        ethUsdPriceFeed: "0x8A753747A1Fa494EC906cE90E9f37563A8AF630e",
    },
}

//helps us with mocks
const developmentChains = ["hardhat", "localhost"]

//so we can use elsewhere
const DECIMALS = "8"
const INITIAL_PRICE = "200000000000" // 2000 price feed starts at
//export this networkConfig so other scripts can work with it
//instead of doing it how we do in the other hardhat.config where all of the above
//is in module.exports, we do it like this below because we are exporting multiple things
module.exports = {
    networkConfig,
    developmentChains, //exporting it so others can use 00-deploy
    DECIMALS,
    INITIAL_PRICE,
}