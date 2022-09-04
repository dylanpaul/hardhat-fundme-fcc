const { assert, expect } = require("chai")
const { network, deployments, ethers } = require("hardhat") //deplopyments object has fixture 
const { developmentChains } = require("../../helper-hardhat-config")

//only runs on development chains
!developmentChains.includes(network.name)
    ? describe.skip
    //for entire contract
    : describe("FundMe", function () {
          let fundMe
          let mockV3Aggregator
          let deployer
          const sendValue = ethers.utils.parseEther("1") //converts 1 to 10^18
          //deploy contract
          beforeEach(async () => {
              // const accounts = await ethers.getSigners() //gets accounts from network in config
              // deployer = accounts[0]
              deployer = (await getNamedAccounts()).deployer //tells ethers what account we want connected to fundme
              await deployments.fixture(["all"]) //deploys everything in our deploy folder
              fundMe = await ethers.getContract("FundMe", deployer) //gets most recent contract deployed
              mockV3Aggregator = await ethers.getContract(
                  "MockV3Aggregator",
                  deployer
              )
          })
        //just for constructor
          describe("constructor", function () {
              it("sets the aggregator addresses correctly", async () => {
                  const response = await fundMe.getPriceFeed() //want this price feed to be same as mock aggregator since we are running these tests locally
                  assert.equal(response, mockV3Aggregator.address)
              })
          })

          describe("fund", function () {
              // https://ethereum-waffle.readthedocs.io/en/latest/matchers.html
              // could also do assert.fail
              it("Fails if you don't send enough ETH", async () => {
                  await expect(fundMe.fund()).to.be.revertedWith( //expects failure if it fails
                      "You need to spend more ETH!"
                  )
              })
              // we could be even more precise here by making sure exactly $50 works
              // but this is good enough for now
              it("Updates the amount funded data structure", async () => {
                  await fundMe.fund({ value: sendValue })
                  const response = await fundMe.getAddressToAmountFunded(
                      deployer
                  )
                  assert.equal(response.toString(), sendValue.toString()) //send value should be
              })
              it("Adds funder to array of funders", async () => {
                  await fundMe.fund({ value: sendValue })
                  const response = await fundMe.getFunder(0)
                  assert.equal(response, deployer)
              })
          })
          describe("withdraw", function () {
              beforeEach(async () => {
                  await fundMe.fund({ value: sendValue }) //automatically funds the contract before tests
              })
              it("withdraws ETH from a single funder", async () => {
                  // Arrange: get starting balances of both fundMe contract and deployer
                  const startingFundMeBalance =
                      await fundMe.provider.getBalance(fundMe.address)
                  const startingDeployerBalance =
                      await fundMe.provider.getBalance(deployer)

                  // Act: do the actions
                  const transactionResponse = await fundMe.withdraw()
                  const transactionReceipt = await transactionResponse.wait()
                  const { gasUsed, effectiveGasPrice } = transactionReceipt //pulling objects out of receipt obj
                  const gasCost = gasUsed.mul(effectiveGasPrice) //multiply bigNumbers together to get total gas cost

                  const endingFundMeBalance = await fundMe.provider.getBalance(
                      fundMe.address
                  ) //uses getBalance function of provider object
                  const endingDeployerBalance =
                      await fundMe.provider.getBalance(deployer)

                  // Assert: are they equal
                  // Maybe clean up to understand the testing
                  assert.equal(endingFundMeBalance, 0) //withdrew so should be 0
                  assert.equal(
                      startingFundMeBalance
                          .add(startingDeployerBalance)
                          .toString(),
                      endingDeployerBalance.add(gasCost).toString()
                  ) //because called from chain it is bigNumber... needed to take into account gas
              })
              // this test is overloaded. Ideally we'd split it into multiple tests
              // but for simplicity we left it as one
              it("is allows us to withdraw with multiple funders", async () => {
                  // Arrange
                  const accounts = await ethers.getSigners()
                  for (i = 1; i < 6; i++) {
                      const fundMeConnectedContract = await fundMe.connect(
                          accounts[i]
                      ) //currently anytime we call a tx with FundMe, the deployer is the account calling that tx
                      await fundMeConnectedContract.fund({ value: sendValue }) //connected to different accounts sending funds rather than deployer
                  }
                  const startingFundMeBalance =
                      await fundMe.provider.getBalance(fundMe.address)
                  const startingDeployerBalance =
                      await fundMe.provider.getBalance(deployer)

                  // Act
                  const transactionResponse = await fundMe.cheaperWithdraw()
                  // Let's comapre gas costs :)
                  // const transactionResponse = await fundMe.withdraw()
                  const transactionReceipt = await transactionResponse.wait()
                  const { gasUsed, effectiveGasPrice } = transactionReceipt
                  const withdrawGasCost = gasUsed.mul(effectiveGasPrice)
                  console.log(`GasCost: ${withdrawGasCost}`)
                  console.log(`GasUsed: ${gasUsed}`)
                  console.log(`GasPrice: ${effectiveGasPrice}`)
                  const endingFundMeBalance = await fundMe.provider.getBalance(
                      fundMe.address
                  )
                  const endingDeployerBalance =
                      await fundMe.provider.getBalance(deployer)
                  // Assert
                  assert.equal(
                      startingFundMeBalance
                          .add(startingDeployerBalance)
                          .toString(),
                      endingDeployerBalance.add(withdrawGasCost).toString()
                  )
                  // Make a getter for storage variables... funders array reset properly
                  await expect(fundMe.getFunder(0)).to.be.reverted

                  for (i = 1; i < 6; i++) {
                      assert.equal(
                          await fundMe.getAddressToAmountFunded(
                              accounts[i].address
                          ),
                          0
                      )
                  }
              })
              it("Only allows the owner to withdraw", async function () {
                  const accounts = await ethers.getSigners()
                  const fundMeConnectedContract = await fundMe.connect(
                      accounts[1]
                  ) //attacker or not owner trying to withdraw
                  await expect(
                      fundMeConnectedContract.withdraw()
                  ).to.be.revertedWith("FundMe__NotOwner")
              })
          })
      })
