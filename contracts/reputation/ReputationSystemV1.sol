// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

/**
 * @title ReputationSystemV1
 * @notice Secure on-chain reputation system with anti-manipulation features
 * @dev Implements security measures against sybil attacks, collusion, and gaming
 */
contract ReputationSystemV1 is 
    AccessControlUpgradeable,
    PausableUpgradeable,
    ReentrancyGuardUpgradeable,
    UUPSUpgradeable
{
    // ============ Constants ============
    
    bytes32 public constant UPDATER_ROLE = keccak256("UPDATER_ROLE");
    bytes32 public constant VALIDATOR_ROLE = keccak256("VALIDATOR_ROLE");
    bytes32 public constant SLASHER_ROLE = keccak256("SLASHER_ROLE");
    
    uint256 public constant MAX_SCORE = 100;
    uint256 public constant MAX_SCORE_CHANGE = 20;
    uint256 public constant MIN_EVENT_INTERVAL = 1 hours;
    uint256 public constant MERKLE_TREE_HEIGHT = 20;
    
    // ============ State Variables ============
    
    struct ReputationData {
        uint256 score;
        uint256 lastUpdateTime;
        bytes32 merkleRoot;
        bool frozen;
        uint256 totalEvents;
    }
    
    struct ReputationEvent {
        address subject;
        int256 scoreChange;
        string eventType;
        bytes32 evidenceHash;
        uint256 timestamp;
        bool validated;
        address validator;
    }
    
    mapping(address => ReputationData) public reputations;
    mapping(bytes32 => ReputationEvent) public events;
    mapping(address => uint256) public nonces;
    mapping(bytes32 => bool) public processedEvents;
    mapping(address => mapping(string => uint256)) public lastEventTypeTime;
    
    // Anti-manipulation mappings
    mapping(address => uint256) public stakeAmounts;
    mapping(address => uint256) public slashingHistory;
    mapping(address => address[]) public interactionGraph;
    
    uint256 public totalStaked;
    address public stakingToken;
    address public treasury;
    AggregatorV3Interface public priceFeed;
    
    // ============ Events ============
    
    event ReputationUpdated(
        address indexed user,
        uint256 oldScore,
        uint256 newScore,
        string eventType,
        bytes32 evidenceHash
    );
    
    event ReputationFrozen(address indexed user, string reason);
    event ReputationUnfrozen(address indexed user);
    event EventValidated(bytes32 indexed eventId, address validator);
    event UserSlashed(address indexed user, uint256 amount, string reason);
    event MerkleRootUpdated(address indexed user, bytes32 newRoot);
    
    // ============ Modifiers ============
    
    modifier onlyActiveReputation(address user) {
        require(!reputations[user].frozen, "Reputation frozen");
        _;
    }
    
    modifier validScoreChange(int256 change) {
        require(
            change >= -int256(MAX_SCORE_CHANGE) && 
            change <= int256(MAX_SCORE_CHANGE),
            "Score change exceeds limits"
        );
        _;
    }
    
    modifier nonReplayable(bytes32 eventId) {
        require(!processedEvents[eventId], "Event already processed");
        processedEvents[eventId] = true;
        _;
    }
    
    modifier rateLimited(address user, string memory eventType) {
        require(
            block.timestamp >= lastEventTypeTime[user][eventType] + MIN_EVENT_INTERVAL,
            "Rate limit exceeded"
        );
        lastEventTypeTime[user][eventType] = block.timestamp;
        _;
    }
    
    // ============ Initialization ============
    
    function initialize(
        address _stakingToken,
        address _treasury,
        address _priceFeed
    ) public initializer {
        __AccessControl_init();
        __Pausable_init();
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(UPDATER_ROLE, msg.sender);
        
        stakingToken = _stakingToken;
        treasury = _treasury;
        priceFeed = AggregatorV3Interface(_priceFeed);
    }
    
    // ============ Core Functions ============
    
    /**
     * @notice Submit a reputation event with evidence
     * @param user The user whose reputation is being updated
     * @param scoreChange The change in reputation score
     * @param eventType The type of event causing the update
     * @param evidence The evidence supporting the update
     * @param signature Signature proving the event authenticity
     */
    function submitReputationEvent(
        address user,
        int256 scoreChange,
        string memory eventType,
        bytes memory evidence,
        bytes memory signature
    ) external 
        whenNotPaused 
        onlyRole(UPDATER_ROLE)
        onlyActiveReputation(user)
        validScoreChange(scoreChange)
        rateLimited(user, eventType)
        nonReentrant
    {
        // Generate event ID
        bytes32 eventId = keccak256(abi.encodePacked(
            user,
            scoreChange,
            eventType,
            evidence,
            block.timestamp,
            nonces[user]++
        ));
        
        // Verify signature
        require(
            _verifySignature(eventId, signature),
            "Invalid signature"
        );
        
        // Check for manipulation patterns
        _checkManipulationPatterns(user, scoreChange, eventType);
        
        // Create event
        events[eventId] = ReputationEvent({
            subject: user,
            scoreChange: scoreChange,
            eventType: eventType,
            evidenceHash: keccak256(evidence),
            timestamp: block.timestamp,
            validated: false,
            validator: address(0)
        });
        
        // Update reputation
        _updateReputation(user, scoreChange, eventType, eventId);
        
        // Mark event as processed
        processedEvents[eventId] = true;
    }
    
    /**
     * @notice Validate a pending reputation event
     * @param eventId The ID of the event to validate
     */
    function validateEvent(bytes32 eventId) 
        external 
        onlyRole(VALIDATOR_ROLE) 
    {
        ReputationEvent storage repEvent = events[eventId];
        require(repEvent.timestamp > 0, "Event does not exist");
        require(!repEvent.validated, "Already validated");
        
        repEvent.validated = true;
        repEvent.validator = msg.sender;
        
        emit EventValidated(eventId, msg.sender);
    }
    
    /**
     * @notice Stake tokens to back reputation
     * @param amount Amount of tokens to stake
     */
    function stake(uint256 amount) external nonReentrant whenNotPaused {
        require(amount > 0, "Invalid amount");
        
        // Transfer tokens
        IERC20(stakingToken).transferFrom(msg.sender, address(this), amount);
        
        stakeAmounts[msg.sender] += amount;
        totalStaked += amount;
        
        // Boost reputation for staking
        _updateReputation(msg.sender, 5, "stake_deposit", bytes32(0));
    }
    
    /**
     * @notice Slash a user's stake for malicious behavior
     * @param user The user to slash
     * @param percentage Percentage of stake to slash (0-100)
     * @param reason Reason for slashing
     */
    function slash(
        address user,
        uint256 percentage,
        string memory reason
    ) external onlyRole(SLASHER_ROLE) {
        require(percentage <= 100, "Invalid percentage");
        require(stakeAmounts[user] > 0, "No stake to slash");
        
        uint256 slashAmount = (stakeAmounts[user] * percentage) / 100;
        
        stakeAmounts[user] -= slashAmount;
        totalStaked -= slashAmount;
        slashingHistory[user] += slashAmount;
        
        // Transfer slashed amount to treasury
        IERC20(stakingToken).transfer(treasury, slashAmount);
        
        // Reduce reputation
        _updateReputation(user, -int256(percentage / 5), "slash", bytes32(0));
        
        emit UserSlashed(user, slashAmount, reason);
    }
    
    /**
     * @notice Freeze a user's reputation for investigation
     * @param user The user to freeze
     * @param reason Reason for freezing
     */
    function freezeReputation(address user, string memory reason) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        reputations[user].frozen = true;
        emit ReputationFrozen(user, reason);
    }
    
    /**
     * @notice Unfreeze a user's reputation
     * @param user The user to unfreeze
     */
    function unfreezeReputation(address user) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        reputations[user].frozen = false;
        emit ReputationUnfrozen(user);
    }
    
    // ============ Internal Functions ============
    
    function _updateReputation(
        address user,
        int256 change,
        string memory eventType,
        bytes32 eventId
    ) internal {
        ReputationData storage rep = reputations[user];
        uint256 oldScore = rep.score;
        
        // Calculate new score with bounds checking
        if (change > 0) {
            rep.score = _min(rep.score + uint256(change), MAX_SCORE);
        } else {
            uint256 decrease = uint256(-change);
            rep.score = rep.score > decrease ? rep.score - decrease : 0;
        }
        
        rep.lastUpdateTime = block.timestamp;
        rep.totalEvents++;
        
        // Update merkle root (simplified - in production would build full tree)
        rep.merkleRoot = keccak256(abi.encodePacked(
            rep.merkleRoot,
            eventId,
            block.timestamp
        ));
        
        emit ReputationUpdated(user, oldScore, rep.score, eventType, eventId);
        emit MerkleRootUpdated(user, rep.merkleRoot);
    }
    
    function _checkManipulationPatterns(
        address user,
        int256 scoreChange,
        string memory eventType
    ) internal view {
        // Check for rapid score increases
        if (scoreChange > 10) {
            require(
                reputations[user].totalEvents > 10,
                "Insufficient history for large increase"
            );
        }
        
        // Check stake requirements for reputation level
        uint256 currentScore = reputations[user].score;
        uint256 requiredStake = _getRequiredStake(currentScore);
        require(
            stakeAmounts[user] >= requiredStake,
            "Insufficient stake for reputation level"
        );
        
        // Check for suspicious interaction patterns
        address[] memory interactions = interactionGraph[user];
        require(
            interactions.length == 0 || _checkInteractionDiversity(interactions),
            "Suspicious interaction pattern"
        );
    }
    
    function _getRequiredStake(uint256 score) internal pure returns (uint256) {
        if (score < 20) return 100 * 10**18;  // 100 tokens
        if (score < 40) return 500 * 10**18;  // 500 tokens
        if (score < 60) return 2000 * 10**18; // 2000 tokens
        if (score < 80) return 5000 * 10**18; // 5000 tokens
        return 10000 * 10**18; // 10000 tokens
    }
    
    function _checkInteractionDiversity(address[] memory interactions) 
        internal 
        pure 
        returns (bool) 
    {
        if (interactions.length < 3) return true;
        
        // Check for circular patterns (simplified)
        for (uint i = 0; i < interactions.length - 1; i++) {
            for (uint j = i + 1; j < interactions.length; j++) {
                if (interactions[i] == interactions[j]) {
                    return false; // Repeated interaction
                }
            }
        }
        
        return true;
    }
    
    function _verifySignature(bytes32 eventId, bytes memory signature) 
        internal 
        view 
        returns (bool) 
    {
        // Simplified signature verification
        // In production, implement proper ECDSA verification
        return signature.length == 65;
    }
    
    function _min(uint256 a, uint256 b) internal pure returns (uint256) {
        return a < b ? a : b;
    }
    
    // ============ View Functions ============
    
    function getReputation(address user) external view returns (
        uint256 score,
        uint256 lastUpdate,
        bool frozen,
        uint256 stakedAmount
    ) {
        ReputationData memory rep = reputations[user];
        return (
            rep.score,
            rep.lastUpdateTime,
            rep.frozen,
            stakeAmounts[user]
        );
    }
    
    function getReputationProof(address user) external view returns (
        bytes32 merkleRoot,
        uint256 totalEvents,
        uint256 timestamp
    ) {
        ReputationData memory rep = reputations[user];
        return (
            rep.merkleRoot,
            rep.totalEvents,
            rep.lastUpdateTime
        );
    }
    
    function checkMinimumReputation(address user, uint256 required) 
        external 
        view 
        returns (bool) 
    {
        return reputations[user].score >= required && !reputations[user].frozen;
    }
    
    // ============ Admin Functions ============
    
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }
    
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }
    
    function _authorizeUpgrade(address newImplementation) 
        internal 
        override 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {}
    
    // ============ Emergency Functions ============
    
    function emergencyWithdraw(address token, uint256 amount) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        require(paused(), "Must be paused");
        IERC20(token).transfer(treasury, amount);
    }
}