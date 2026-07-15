// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Stores each wallet's own approval-safety preferences on-chain.
/// Noryx's frontend reads this to warn a user when a transaction they're
/// about to sign violates a rule they set for themselves.
contract SecurityProfile {
    struct Preferences {
        bool blockUnlimitedApprovals;
        uint256 maxApprovalAmount;
        bool warnNewContracts;
        bool exists;
    }

    mapping(address => Preferences) private profiles;

    event PreferencesSaved(
        address indexed user,
        bool blockUnlimitedApprovals,
        uint256 maxApprovalAmount,
        bool warnNewContracts
    );

    function savePreferences(
        bool blockUnlimitedApprovals,
        uint256 maxApprovalAmount,
        bool warnNewContracts
    ) external {
        profiles[msg.sender] = Preferences(
            blockUnlimitedApprovals,
            maxApprovalAmount,
            warnNewContracts,
            true
        );
        emit PreferencesSaved(
            msg.sender,
            blockUnlimitedApprovals,
            maxApprovalAmount,
            warnNewContracts
        );
    }

    function getPreferences(
        address user
    )
        external
        view
        returns (
            bool blockUnlimitedApprovals,
            uint256 maxApprovalAmount,
            bool warnNewContracts,
            bool exists
        )
    {
        Preferences memory p = profiles[user];
        return (
            p.blockUnlimitedApprovals,
            p.maxApprovalAmount,
            p.warnNewContracts,
            p.exists
        );
    }
}
