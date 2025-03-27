import React, { useState, useEffect } from 'react';
import * as paymentService from '../services/paymentService';

const PlayAttemptsPurchase = ({ 
  isOpen, 
  onClose, 
  onPurchase, 
  isNFTVerified, 
  balance,
  ayaBalance,
  maxAllowedAttempts = 1000,
  remainingAttempts = 0,
  tokenPrices
}) => {
  console.log("PlayAttemptsPurchase component rendered with isOpen =", isOpen);
  console.log("Initial props:", { 
    balance, 
    ayaBalance, 
    isNFTVerified, 
    maxAllowedAttempts, 
    remainingAttempts,
    tokenPrices 
  });
  
  const [selectedPlays, setSelectedPlays] = useState(1);
  const [paymentToken, setPaymentToken] = useState('SUI');
  const [cost, setCost] = useState({});
  const [maxPlays, setMaxPlays] = useState(25);

  // Update token prices in payment service whenever they change
  useEffect(() => {
    if (tokenPrices) {
      paymentService.updateTokenPrices(tokenPrices);
    }
  }, [tokenPrices]);

  // Calculate the cost whenever inputs change
  useEffect(() => {
    console.log("PlayAttemptsPurchase useEffect running, isOpen =", isOpen);
    const isAyaPayment = paymentToken === 'AYA';
    console.log("Payment settings:", { 
      paymentToken, 
      isAyaPayment, 
      selectedPlays,
      balance: typeof balance === 'bigint' ? balance.toString() : balance,
      ayaBalance: typeof ayaBalance === 'bigint' ? ayaBalance.toString() : ayaBalance
    });
    
    const costInfo = paymentService.formatPlayAttemptsCost(selectedPlays, isNFTVerified, isAyaPayment);
    setCost(costInfo);
    console.log("Cost info calculated:", costInfo);
    
    // Calculate max possible plays based on balance
    const relevantBalance = isAyaPayment ? ayaBalance : balance;
    console.log("Relevant balance for calculation:", 
      typeof relevantBalance === 'bigint' ? relevantBalance.toString() : relevantBalance, 
      isAyaPayment ? "(AYA)" : "(SUI)",
      "| Original balance values:", {
        ayaBalance: typeof ayaBalance === 'bigint' ? ayaBalance.toString() : ayaBalance,
        balance: typeof balance === 'bigint' ? balance.toString() : balance
      }
    );
    
    const calculatedMaxPlays = paymentService.calculateMaxPlayAttempts(
      relevantBalance, 
      isNFTVerified, 
      isAyaPayment
    );
    console.log("Calculated max plays from balance:", calculatedMaxPlays);
    
    // Enforce max 25 per purchase and max 1000 total
    const maxPossiblePlays = Math.min(25, calculatedMaxPlays || 0);
    const maxWithTotalLimit = Math.min(maxPossiblePlays, maxAllowedAttempts - remainingAttempts);
    const finalMaxPlays = Math.max(1, maxWithTotalLimit);
    
    console.log("Final max plays:", finalMaxPlays, 
      "| From:", { 
        calculatedMaxPlays, 
        maxPossiblePlays, 
        maxWithTotalLimit,
        maxAllowedAttempts,
        remainingAttempts
      }
    );
    
    setMaxPlays(finalMaxPlays);
  }, [selectedPlays, paymentToken, isNFTVerified, balance, ayaBalance, maxAllowedAttempts, remainingAttempts, tokenPrices]);

  // Adjust selected plays if it exceeds the new max
  useEffect(() => {
    if (selectedPlays > maxPlays) {
      console.log("Adjusting selectedPlays to match maxPlays:", maxPlays);
      setSelectedPlays(maxPlays);
    }
  }, [maxPlays, selectedPlays]);

  const handlePurchase = () => {
    console.log("Purchase button clicked, selectedPlays =", selectedPlays);
    if (selectedPlays <= 0) return;

    const purchaseDetails = {
      plays: selectedPlays,
      paymentToken,
      isAyaPayment: paymentToken === 'AYA',
      cost: cost.totalCostMist
    };
    
    console.log("Sending purchase details:", purchaseDetails);
    onPurchase(purchaseDetails);
  };

  const handleTokenChange = (token) => {
    console.log("Token changed from", paymentToken, "to", token);
    setPaymentToken(token);
    
    // Reset selectedPlays to 1 when changing tokens to ensure proper recalculation
    if (token !== paymentToken) {
      console.log("Resetting selectedPlays to 1 due to token change");
      setSelectedPlays(1);
    }
  };

  console.log("About to render or return null, isOpen =", isOpen);
  if (!isOpen) {
    console.log("NOT rendering modal because isOpen is falsy");
    return null;
  }
  
  console.log("RENDERING MODAL - isOpen is true!");

  return (
    <div className="modal-overlay" style={{ 
      zIndex: 9999, 
      position: 'fixed', 
      top: 0, 
      left: 0, 
      right: 0, 
      bottom: 0, 
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center'
    }}>
      <div className="modal-content purchase-modal" style={{ 
        background: 'white', 
        borderRadius: '10px', 
        padding: '20px',
        maxWidth: '500px',
        width: '90%',
        boxShadow: '0 0 20px rgba(0, 0, 0, 0.3)',
        color: '#333'
      }}>
        <div className="modal-header" style={{ 
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          borderBottom: '1px solid #eee',
          paddingBottom: '10px'
        }}>
          <h2 style={{ margin: 0, color: '#0066cc', fontSize: '24px' }}>Purchase Play Attempts</h2>
          <button className="close-button" style={{
            background: 'none',
            border: 'none',
            fontSize: '24px',
            cursor: 'pointer',
            color: '#666'
          }} onClick={() => {
            console.log("Close button clicked in modal");
            onClose();
          }}>×</button>
        </div>
        
        <div className="modal-body" style={{ marginBottom: '20px' }}>
          <div className="payment-options">
            <div className="token-selection" style={{ 
              display: 'flex',
              gap: '10px',
              marginBottom: '20px'
            }}>
              <button 
                style={{ 
                  flex: 1,
                  padding: '12px',
                  border: paymentToken === 'SUI' ? '2px solid #0066cc' : '1px solid #ddd',
                  borderRadius: '6px',
                  background: paymentToken === 'SUI' ? '#e6f2ff' : 'white',
                  cursor: 'pointer',
                  fontWeight: paymentToken === 'SUI' ? 'bold' : 'normal'
                }}
                onClick={() => handleTokenChange('SUI')}
              >
                Pay with SUI
              </button>
              <button 
                style={{ 
                  flex: 1,
                  padding: '12px',
                  border: paymentToken === 'AYA' ? '2px solid #0066cc' : '1px solid #ddd',
                  borderRadius: '6px',
                  background: paymentToken === 'AYA' ? '#e6f2ff' : 'white',
                  cursor: 'pointer',
                  fontWeight: paymentToken === 'AYA' ? 'bold' : 'normal'
                }}
                onClick={() => handleTokenChange('AYA')}
              >
                Pay with AYA (25% off)
              </button>
            </div>
            
            <div className="slider-container" style={{ 
              marginBottom: '20px'
            }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px',
                fontWeight: 'bold'
              }}>
                Select Play Attempts: <span className="play-count" style={{ color: '#0066cc' }}>{selectedPlays}</span>
              </label>
              <div className="slider-with-labels" style={{ 
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <span style={{ fontWeight: 'bold' }}>1</span>
                <input
                  type="range"
                  min="1"
                  max={maxPlays}
                  value={selectedPlays}
                  onChange={(e) => {
                    const newValue = parseInt(e.target.value);
                    console.log("Slider changed to:", newValue);
                    setSelectedPlays(newValue);
                  }}
                  style={{ 
                    flex: 1,
                    height: '8px',
                    accentColor: '#0066cc'
                  }}
                />
                <span style={{ fontWeight: 'bold' }}>{maxPlays}</span>
              </div>
            </div>
            
            <div className="cost-display" style={{
              background: '#f5f5f5',
              padding: '15px',
              borderRadius: '6px',
              marginBottom: '20px',
              textAlign: 'center'
            }}>
              {cost.discountApplied && (
                <div className="original-cost" style={{ marginBottom: '5px' }}>
                  <span className="strikethrough" style={{ 
                    textDecoration: 'line-through',
                    color: '#888',
                    marginRight: '8px'
                  }}>{cost.originalCostSui} {paymentToken}</span>
                  <span className="discount-badge" style={{
                    background: '#ff4d4d',
                    color: 'white',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}>-{cost.discountPercentage}%</span>
                </div>
              )}
              <div className="final-cost" style={{ fontSize: '20px' }}>
                Total: <strong style={{ color: '#0066cc' }}>{cost.totalCostSui} {paymentToken}</strong>
              </div>
              
              <div style={{ 
                marginTop: '10px',
                display: 'flex',
                flexDirection: 'column',
                gap: '5px'
              }}>
                {isNFTVerified && (
                  <div className="discount-note" style={{
                    color: '#22cc66',
                    fontSize: '14px',
                    fontWeight: 'bold'
                  }}>
                    NFT holder discount applied!
                  </div>
                )}
                
                {paymentToken === 'AYA' && (
                  <div className="discount-note" style={{
                    color: '#22cc66',
                    fontSize: '14px',
                    fontWeight: 'bold'
                  }}>
                    AYA token discount applied!
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="purchase-summary" style={{
            background: '#f8f8f8',
            padding: '15px',
            borderRadius: '6px',
            fontSize: '15px'
          }}>
            <p style={{ margin: '5px 0' }}>You will receive <strong style={{ color: '#0066cc' }}>{selectedPlays}</strong> play attempt{selectedPlays !== 1 ? 's' : ''}.</p>
            <p style={{ margin: '5px 0' }}>Current attempts: <strong>{remainingAttempts}</strong></p>
            <p style={{ margin: '5px 0' }}>New total: <strong style={{ color: '#0066cc' }}>{remainingAttempts + selectedPlays}</strong></p>
            
            {(remainingAttempts + selectedPlays) >= maxAllowedAttempts && (
              <p className="max-note" style={{
                color: '#ff6600',
                fontWeight: 'bold',
                marginTop: '10px'
              }}>
                Maximum allowed attempts (1000) will be reached.
              </p>
            )}
          </div>
        </div>
        
        <div className="modal-footer" style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '15px',
          borderTop: '1px solid #eee',
          paddingTop: '15px'
        }}>
          <button 
            className="cancel-button"
            style={{
              padding: '10px 20px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              background: '#f5f5f5',
              cursor: 'pointer'
            }}
            onClick={() => {
              console.log("Cancel button clicked in modal");
              onClose();
            }}
          >
            Cancel
          </button>
          <button 
            className="purchase-button"
            style={{
              padding: '10px 25px',
              border: 'none',
              borderRadius: '4px',
              background: selectedPlays <= 0 ? '#cccccc' : '#0066cc',
              color: 'white',
              fontWeight: 'bold',
              cursor: selectedPlays <= 0 ? 'not-allowed' : 'pointer'
            }}
            onClick={handlePurchase}
            disabled={selectedPlays <= 0}
          >
            Purchase {selectedPlays} Attempt{selectedPlays !== 1 ? 's' : ''}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PlayAttemptsPurchase; 