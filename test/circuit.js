const path = require("path");
const {assert} = require("chai");
const wasm_tester = require("circom_tester").wasm;
const F1Field = require("ffjavascript").F1Field;
const Scalar = require("ffjavascript").Scalar;
exports.p = Scalar.fromString("21888242871839275222246405745257275088548364400416034343698204186575808495617");
const Fr = new F1Field(exports.p);
const { IncrementalMerkleSumTree, Utils } = require("pyt-merkle-sum-tree")
const { poseidon } = require("circomlibjs")  // v0.0.8

describe("Tree Testing", function async() {


    beforeEach(async function () {
        this.timeout(100000);
        circuit = await wasm_tester(path.join(__dirname, "../circuits", "pyt-pos.circom"));

        const pathToCsv = "test/entries/entry-16-valid.csv" 
        // total sum of the liablities is 84359

        tree = new IncrementalMerkleSumTree(pathToCsv) // Init a tree from the entries in the csv file

        entry = {
            username : "gAdsIaKy",
            balance : BigInt(7534)
        }

        // get the input
        const entryIndex = tree.indexOf(entry) 
        input = tree.createProof(entryIndex)

    });

    it("should verify a proof of inclusion of an existing entry if assetsSum > liabilitiesSum", async () => {

        // add property assetsSum to input object 
        input.assetsSum = BigInt(84360);

        let usernammeToBigInt = Utils.parseUsernameToBigInt(entry.username) 

        const expectedHashOutput = poseidon([usernammeToBigInt, entry.balance])

        // // Calculate the witness
        let witness = await circuit.calculateWitness(input);
        await circuit.assertOut(witness, {leafHash: expectedHashOutput})
        await circuit.checkConstraints(witness);
    });

    it("should verify a proof of inclusion of an existing entry if assetsSum  = liabilitiesSum", async () => {

        // add property assetsSum to input object 
        input.assetsSum = BigInt(84359);

        let usernammeToBigInt = Utils.parseUsernameToBigInt(entry.username) 

        const expectedHashOutput = poseidon([usernammeToBigInt, entry.balance])

        // // Calculate the witness
        let witness = await circuit.calculateWitness(input);
        await circuit.assertOut(witness, {leafHash: expectedHashOutput})
        await circuit.checkConstraints(witness);
    });

    it("shouldn't verify a proof of inclusion of an existing entry if assetsSum < liabilitiesSum", async () => {

        // add property assetsSum to input object 
        input.assetsSum = BigInt(84358);

        try {
            let witness = await circuit.calculateWitness(input);
            await circuit.checkConstraints(witness);
            assert(false)
        }  catch (e) {
            assert.equal(e.message.slice(0, 21), "Error: Assert Failed.")
            assert.equal(e.message.slice(22, 59), "Error in template PytPos_154 line: 65")
        }

    });

    it("shouldn't verify a proof of inclusion of a non-existing entry", async () => {

        // add property assetsSum to input object 
        input.assetsSum = BigInt(84359);

        let usernammeToBigInt = Utils.parseUsernameToBigInt("alice") 


        // add a non-existing entry to the input 
        input.leafUsername = usernammeToBigInt
        input.leafSum = BigInt(99)

        // add property assetsSum to input object 
        input.assetsSum = BigInt(84358);

        try {
            let witness = await circuit.calculateWitness(input);
            await circuit.checkConstraints(witness);
            assert(false)
        }  catch (e) {
            assert.equal(e.message.slice(0, 21), "Error: Assert Failed.")
            assert.equal(e.message.slice(22, 59), "Error in template PytPos_154 line: 59")
        }

    });

    it("shouldn't verify a proof of inclusion based on an invalid root", async () => {

        // Invalidate the root
        input.rootHash = input.rootHash + 1n

        // add property assetsSum to input object 
        input.assetsSum = BigInt(84358);

        try {
            let witness = await circuit.calculateWitness(input);
            await circuit.checkConstraints(witness);
            assert(false)
        }  catch (e) {
            assert.equal(e.message.slice(0, 21), "Error: Assert Failed.")
            assert.equal(e.message.slice(22, 59), "Error in template PytPos_154 line: 59")
        }
    });

    it("should generate an error if one of the balances overflows 2**252", async () => {

        // add a balance that overflows 2**252 to the input
        input.leafSum = exports.p - 1n

        // add property assetsSum to input object 
        input.assetsSum = BigInt(84358);

        try {
            let witness = await circuit.calculateWitness(input);
            await circuit.checkConstraints(witness);
            assert(false)
        }  catch (e) {
            assert.equal(e.message.slice(0, 21), "Error: Assert Failed.")
            assert.equal(e.message.slice(61, 99), "Error in template SafeSum_152 line: 33")
        }

    });

    it("should generate an error if the sum of two balances overflows 2**252", async () => {

        // add a balance that will overflow 2**252 when added to the another balance
        input.leafSum = BigInt(2**252) - 1n

        // add property assetsSum to input object 
        input.assetsSum = BigInt(84358);

        try {
            let witness = await circuit.calculateWitness(input);
            await circuit.checkConstraints(witness);
            assert(false)
        }  catch (e) {
            assert.equal(e.message.slice(0, 21), "Error: Assert Failed.")
            assert.equal(e.message.slice(61, 99), "Error in template SafeSum_152 line: 33")
        }

    });

});