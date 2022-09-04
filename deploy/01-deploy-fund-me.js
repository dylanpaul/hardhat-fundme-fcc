//in this script we define how we want to deploy the fund me contract

//import
//main function
//calling of main function

// function deployFunc() {
//     console.log("Hi!")
//     hre.getNamedAccounts()
//     hre.deployments()
// }

// module.exports.default = deployFunc

//all three below are the same... one uncommented we can use because of script we wrote
//const helperConfig = require("../helper-hardhat-config")
//const networkConfig = helperConfig.networkConfig
const { network } = require("hardhat")
const { networkConfig, developmentChains } = require("../helper-hardhat-config")
const { verify } = require("../utils/verify")

//now using anonymous async func which is identical to above
//hre basically same thing as hardhat
module.exports = async ({ getNamedAccounts, deployments }) => {
    //using deployments object to get two functions: deploy, log
    //pull these functions out of deployments
    const { deploy, log, get } = deployments
    //grab deployer account from named Account
    const { deployer } = await getNamedAccounts()
    //grab chainId
    const chainId = network.config.chainId

    //so we don't have to hardcode address in args below
    //if chainId is X use address Y
    //if chainId is Z use address A
    //using the helper config (like in AAVE) so we can do this below
    
    //uses the correct price feed address depending on what chain we are on
    //const ethUsdPriceFeedAddress = networkConfig[chainId]["ethUsdPriceFeed"]
    
    //robust script allowing us to flip between local, testnet, mainnet chains to allow us to deploy anywhere
    //without changing solidity
    let ethUsdPriceFeedAddress
    if (chainId == 31337) {
        const ethUsdAggregator = await get("MockV3Aggregator")
        ethUsdPriceFeedAddress = ethUsdAggregator.address
    } else {
        ethUsdPriceFeedAddress = networkConfig[chainId]["ethUsdPriceFeed"]
    }
    //if the contract doesn't exist, we deploy a minimal version for our local testing
    //don't have to deploy mocks to mainnets because price feeds already exist
    //use our own contracts instead of already established if we are on network with no price feeds (hardhat, local host)

    //when going for localhost or hardhat network we want to use a mock
    //we used to use ContractFactory to help us deploy. with hardhat deploy we can just use this deploy function
    //first is name of contract, second list of overrides

    log("----------------------------------------------------")
    log("Deploying FundMe and waiting for confirmations...")

    const fundMe = await deploy("FundMe", {
        from: deployer, //who is deploying it
        args: [ethUsdPriceFeedAddress], //put price feed address
        log: true, //saves us time instead of console.log 
        waitConfirmations: network.config.blockConfirmations || 1,
    })

    log(`FundMe deployed at ${fundMe.address}`)

    //verify code used to be right in our deploy code
    if (
        !developmentChains.includes(network.name) &&
        process.env.ETHERSCAN_API_KEY
    ) {
        await verify(fundMe.address, [ethUsdPriceFeedAddress]) //because we now have the code from utils
    }


}

module.exports.tags = ["all", "fundme"]