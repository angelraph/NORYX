// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IScoreRegistry {
    function getScore(
        address user
    ) external view returns (uint8 score, uint64 timestamp, bool exists);
}

/// @notice Toy example of a second contract consuming a Noryx ScoreRegistry
/// attestation to gate an action. Proves a published score is a reusable
/// on-chain fact rather than a number that only Noryx's own UI ever sees.
/// Moves no funds — this exists purely to demonstrate composability.
contract ScoreGatedDemo {
    IScoreRegistry public immutable scoreRegistry;
    uint8 public immutable minScore;

    event AccessGranted(address indexed user, uint8 score);

    constructor(address _scoreRegistry, uint8 _minScore) {
        scoreRegistry = IScoreRegistry(_scoreRegistry);
        minScore = _minScore;
    }

    function attemptGatedAction() external returns (bool granted) {
        (uint8 score, , bool exists) = scoreRegistry.getScore(msg.sender);
        require(exists, "No Noryx score published for this wallet");
        require(score >= minScore, "Score below required threshold");
        emit AccessGranted(msg.sender, score);
        return true;
    }
}
