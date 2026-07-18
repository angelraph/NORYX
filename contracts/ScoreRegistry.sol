// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Publishes a wallet's Noryx Wallet Security Score on-chain as a
/// timestamped attestation, so it's a portable fact any Monad contract can
/// read — not just a number shown once in Noryx's own UI.
contract ScoreRegistry {
    struct Attestation {
        uint8 score;
        uint64 timestamp;
        bool exists;
    }

    mapping(address => Attestation) private attestations;

    event ScorePublished(address indexed user, uint8 score, uint64 timestamp);

    function publishScore(uint8 score) external {
        require(score <= 100, "score must be 0-100");
        attestations[msg.sender] = Attestation(score, uint64(block.timestamp), true);
        emit ScorePublished(msg.sender, score, uint64(block.timestamp));
    }

    function getScore(
        address user
    ) external view returns (uint8 score, uint64 timestamp, bool exists) {
        Attestation memory a = attestations[user];
        return (a.score, a.timestamp, a.exists);
    }
}
