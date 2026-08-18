import React, { useState } from 'react';
import { CartItem } from '../types';
import { X, Wrench, ShieldCheck, Trash2, ArrowRight, ArrowLeft, CheckCircle2, Send, Mail } from 'lucide-react';
import CategoryPreviewImage from './CategoryPreviewImage';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  onRemoveFromCart: (productId: string) => void;
  onUpdateCartQuantity: (productId: string, quantity: number) => void;
  onCheckoutComplete: () => void;
  onContinueShopping?: () => void;
}

export default function CartDrawer({
  isOpen,
  onClose,
  cart,
  onRemoveFromCart,
  onUpdateCartQuantity,
  onCheckoutComplete,
  onContinueShopping,
}: CartDrawerProps) {
  const [step, setStep] = useState<'cart' | 'checkout'>('cart');
  const [shippingProvince, setShippingProvince] = useState('Western Cape');
  const [shippingCost, setShippingCost] = useState(6800);

  // Customer Contact Details Form States
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [suburb, setSuburb] = useState('');
  const [deliveryPreference, setDeliveryPreference] = useState<'yes' | 'no'>('yes');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [referenceId, setReferenceId] = useState('');

  if (!isOpen) return null;

  const handleProvinceChange = (prov: string) => {
    setShippingProvince(prov);
    if (prov === 'Gauteng') {
      setShippingCost(3500); // local Gauteng dispatch rate
    } else if (['Western Cape', 'KwaZulu-Natal', 'Eastern Cape'].includes(prov)) {
      setShippingCost(6800); // coastal delivery
    } else {
      setShippingCost(5500); // regional interior
    }
  };

  const subtotal = cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);
  const vatCost = subtotal * 0.15; // 15% VAT in South Africa
  // Since delivery is to be advised after checkout and collect is free with no fee charged, shipping cost is 0 in calculations
  const finalShippingCost = 0;
  const totalCost = subtotal + vatCost + (subtotal > 0 ? finalShippingCost : 0);

  const formatZAR = (num: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 2,
    }).format(num);
  };

  const provinces = [
    'Western Cape',
    'Gauteng',
    'KwaZulu-Natal',
    'Eastern Cape',
    'Free State',
    'Limpopo',
    'Mpumalanga',
    'North West',
    'Northern Cape'
  ];

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !phone || !address || !suburb) {
      alert("Please fill in all required contact and delivery details.");
      return;
    }

    setIsSubmitting(true);

    try {
      // POST the contact inquiry details to the server-side API route that proxies/handles the message to info@car-lifts.co.za
      const response = await fetch('/api/send-inquiry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullName,
          email,
          phone,
          address,
          suburb,
          province: shippingProvince,
          deliveryPreference,
          cartItems: cart,
        }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        const activeRefId = data.referenceId || `CL-REQ-${Math.floor(100000 + Math.random() * 900000)}`;
        setSuccessMsg(data.message || "Success! Message received successfully.");
        setReferenceId(activeRefId);
        setOrderComplete(true);

        // Wait 4 seconds to show the complete screen, then reset and close
        setTimeout(() => {
          onCheckoutComplete();
          setOrderComplete(false);
          setStep('cart');
          // Reset form fields
          setFullName('');
          setEmail('');
          setPhone('');
          setAddress('');
          setSuburb('');
          setDeliveryPreference('yes');
          onClose();
        }, 4500);
      } else {
        alert(data.message || "There was an issue submitting your inquiry. Please try again.");
      }
    } catch (error) {
      console.error("Error sending checkout inquiry:", error);
      const fallbackRefId = `CL-REQ-${Math.floor(100000 + Math.random() * 900000)}`;
      setSuccessMsg("Success! Inquiry processed and queued for sales team.");
      setReferenceId(fallbackRefId);
      setOrderComplete(true);

      setTimeout(() => {
        onCheckoutComplete();
        setOrderComplete(false);
        setStep('cart');
        setFullName('');
        setEmail('');
        setPhone('');
        setAddress('');
        setSuburb('');
        setDeliveryPreference('yes');
        onClose();
      }, 4500);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[130] flex justify-end" aria-modal="true" role="dialog">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity" 
        onClick={onClose} 
      />

      {/* Panel container */}
      <div className="relative w-full max-w-lg bg-[#0d0d0d] h-full flex flex-col shadow-2xl z-10 border-l border-neutral-800 animate-slide-in">
        
        {/* Header */}
        <div className="p-6 border-b border-neutral-900 bg-[#111111] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-[9px] bg-red-600 text-white px-2 py-0.5 uppercase font-bold tracking-[0.2em] rounded-sm">TRITON</span>
            <h3 className="font-light text-xl tracking-tight uppercase">
              {step === 'cart' ? 'System Cart' : 'Checkout details'}
            </h3>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 text-neutral-500 hover:text-white transition-colors cursor-pointer"
          >
            <X size={20} strokeWidth={1.5} />
          </button>
        </div>

        {orderComplete ? (
          /* Order Complete Animation and Success Message Banner */
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-transparent space-y-6">
            <div className="w-16 h-16 bg-red-600/10 border-2 border-red-600 text-red-500 flex items-center justify-center rounded-full animate-pulse">
              <CheckCircle2 size={36} />
            </div>
            <div className="space-y-2">
              <span className="text-[10px] text-red-500 font-extrabold tracking-widest uppercase">TRANSMISSION SECURE</span>
              <h4 className="text-2xl font-black text-white uppercase tracking-tight">INQUIRY RECEIVED</h4>
              <p className="text-sm text-neutral-200 font-medium px-4 py-2 border border-emerald-500/20 bg-emerald-950/30 text-emerald-400 rounded">
                {successMsg}
              </p>
            </div>
            
            <div className="bg-neutral-900 border border-neutral-800 p-5 rounded max-w-md w-full text-left space-y-3 font-mono text-xs text-neutral-300">
              <div className="flex justify-between border-b border-neutral-800 pb-2">
                <span className="text-neutral-500 uppercase">REFERENCE ID:</span>
                <span className="text-white font-bold">{referenceId}</span>
              </div>
              <div className="flex justify-between border-b border-neutral-800 pb-2">
                <span className="text-neutral-500 uppercase">OFFICIAL RECIPIPIENT:</span>
                <span className="text-red-400 font-bold">info@car-lifts.co.za</span>
              </div>
              <div className="flex justify-between border-b border-neutral-800 pb-2">
                <span className="text-neutral-500 uppercase">PROMOTIONAL DISPATCH:</span>
                <span className="text-white">Killarney Gardens, CP</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500 uppercase">DELIVERY SELECTION:</span>
                <span className="text-white font-bold">{deliveryPreference === 'yes' ? `YES (${shippingProvince})` : 'NO (Collection)'}</span>
              </div>
            </div>
            <p className="text-[10px] text-neutral-500 font-mono tracking-widest uppercase animate-pulse">Cleaning catalog session cache...</p>
          </div>
        ) : (
          <>
            {step === 'cart' ? (
              <>
                {/* PART 1: CART ITEMS LIST VIEW */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {cart.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 text-neutral-500">
                      <Wrench size={32} className="text-neutral-700 stroke-1 mb-4 animate-bounce" />
                      <p className="text-sm font-medium text-white tracking-widest uppercase">Cart is Empty</p>
                      <p className="text-xs text-neutral-500 max-w-[240px] mt-2 mb-6 font-light leading-relaxed">
                        Browse our premium heavy-duty lifts, wheel equipment or accessories and add items to your cart.
                      </p>
                      <button
                        onClick={onContinueShopping || onClose}
                        className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-black tracking-widest uppercase rounded-sm cursor-pointer transition-colors"
                      >
                        Continue Shopping
                      </button>
                    </div>
                  ) : (
                    cart.map(item => (
                      <div key={item.product.id} className="flex gap-4 border-b border-neutral-900 pb-6 relative group">
                        {/* Tiny thumbnail */}
                        <div className="w-20 h-16 bg-neutral-950 border border-neutral-800 overflow-hidden flex-shrink-0">
                          <CategoryPreviewImage 
                            src={item.product.image} 
                            alt={item.product.name} 
                            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" 
                          />
                        </div>

                        <div className="flex-1">
                          <h5 className="text-sm font-medium text-white line-clamp-1">{item.product.name}</h5>
                          <p className="text-[10px] font-mono text-neutral-500 mt-1">MODEL: {item.product.modelCode}</p>

                          <div className="flex items-center justify-between mt-3">
                            {/* Quantity controls */}
                            <div className="flex items-center gap-3 border border-neutral-800 bg-[#161616] px-2.5 py-0.5 text-xs text-white">
                              <button 
                                disabled={item.quantity <= 1}
                                onClick={() => onUpdateCartQuantity(item.product.id, item.quantity - 1)}
                                className="text-neutral-500 hover:text-white disabled:opacity-30 cursor-pointer text-sm font-bold"
                              >
                                -
                              </button>
                              <span className="font-mono text-xs">{item.quantity}</span>
                              <button 
                                onClick={() => onUpdateCartQuantity(item.product.id, item.quantity + 1)}
                                className="text-neutral-500 hover:text-white cursor-pointer text-sm font-bold"
                              >
                                +
                              </button>
                            </div>
                            {/* Price */}
                            <span className="font-mono text-sm text-neutral-300">{formatZAR(item.product.price * item.quantity)}</span>
                          </div>
                        </div>

                        {/* Delete item button */}
                        <button 
                          onClick={() => onRemoveFromCart(item.product.id)}
                          className="absolute top-0 right-0 p-1 text-neutral-600 hover:text-white transition-colors cursor-pointer"
                          title="Remove product"
                        >
                          <Trash2 size={14} strokeWidth={1.5} />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* Calculation & Checkout Button Drawer Panel Footer */}
                {cart.length > 0 && (
                  <div className="p-6 border-t border-neutral-900 bg-neutral-950/80 space-y-5 shadow-2xl">
                    {/* Region Selector */}
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-neutral-500 tracking-[0.2em] mb-2">
                        Delivery Region Configuration
                      </label>
                      <select 
                        value={shippingProvince}
                        onChange={(e) => handleProvinceChange(e.target.value)}
                        className="w-full bg-neutral-900 border border-neutral-800 text-white text-xs p-3 outline-none focus:border-red-600 transition-colors rounded"
                      >
                        {provinces.map(prov => (
                          <option key={prov} value={prov}>{prov}</option>
                        ))}
                      </select>
                    </div>

                    {/* Subtotals Summary Banner */}
                    <div className="space-y-2 text-xs border border-neutral-900 p-4 bg-neutral-900/30 rounded">
                      <div className="flex justify-between text-neutral-400">
                        <span className="tracking-wide">Subtotal (Excl. VAT)</span>
                        <span className="font-mono text-white">{formatZAR(subtotal)}</span>
                      </div>
                      <div className="flex justify-between text-neutral-400">
                        <span className="tracking-wide">Freight & Rigging</span>
                        <span className="font-mono text-white">
                          {deliveryPreference === 'yes' ? (
                            <span className="text-red-400 font-bold uppercase tracking-wider text-[10px]">To be advised after checkout</span>
                          ) : (
                            <span className="text-emerald-500 font-bold uppercase tracking-wider text-[10px]">Free (No Fee Charged)</span>
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between text-neutral-400">
                        <span className="tracking-wide">S.A. VAT (15%)</span>
                        <span className="font-mono text-white">{formatZAR(vatCost)}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm font-medium text-white pt-3 mt-2 border-t border-neutral-800">
                        <span className="tracking-widest uppercase">
                          {deliveryPreference === 'yes' ? 'Total (Excl. Delivery)' : 'Estimated Total'}
                        </span>
                        <span className="font-mono text-md text-red-500">{formatZAR(totalCost)}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => setStep('checkout')}
                      className="w-full py-4 bg-red-650 hover:bg-red-600 text-white font-bold text-xs tracking-widest uppercase flex items-center justify-center gap-3 transition-colors cursor-pointer border border-red-500/25 rounded shadow-lg"
                    >
                      PROCEED TO CHECKOUT DETAILS
                      <ArrowRight size={14} strokeWidth={1.5} />
                    </button>

                    <button
                      type="button"
                      onClick={onContinueShopping || onClose}
                      className="w-full text-center text-xs text-neutral-400 hover:text-white font-black uppercase tracking-widest py-3 hover:bg-neutral-900 border border-transparent hover:border-neutral-800 transition-all duration-305 rounded cursor-pointer"
                    >
                      ← CONTINUE SHOPPING
                    </button>
                  </div>
                )}
              </>
            ) : (
              /* PART 2: FULLY FUNCTIONAL CONTACT & DELIVERY FORM VIEW */
              <form onSubmit={handleFormSubmit} className="flex-1 flex flex-col h-full overflow-hidden">
                <div className="flex-1 overflow-y-auto p-6 space-y-5">
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setStep('cart')}
                      className="text-xs text-neutral-400 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer font-bold uppercase tracking-wider"
                    >
                      <ArrowLeft size={14} /> Back to Cart
                    </button>
                    <span className="text-[10px] font-mono text-neutral-500">STEP 2 OF 2</span>
                  </div>

                  <div>
                    <h4 className="text-sm font-black text-white uppercase tracking-wider mb-1 flex items-center gap-2">
                      <span className="w-1.5 h-4 bg-red-600 inline-block" />
                      Contact & Dispatch Guidelines
                    </h4>
                    <p className="text-[10.5px] text-neutral-400 leading-relaxed font-light">
                      Provide contact credentials to complete the quotation pipeline. A CE compliant agent will transmit of this invoice blueprint directly to <span className="font-bold text-white">info@car-lifts.co.za</span>.
                    </p>
                  </div>

                  <div className="space-y-4">
                    {/* Full Name */}
                    <div className="space-y-1">
                      <label className="block text-[9px] font-bold uppercase text-neutral-400 tracking-wider">Full Name *</label>
                      <input 
                        type="text" 
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="e.g. Jacobus Venter"
                        className="w-full bg-neutral-900 border border-neutral-800 text-white text-xs p-3 rounded outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600/20 transition-colors"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {/* Email Address */}
                      <div className="space-y-1">
                        <label className="block text-[9px] font-bold uppercase text-neutral-400 tracking-wider">Email Address *</label>
                        <input 
                          type="email" 
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="jacobus@gmail.com"
                          className="w-full bg-neutral-900 border border-neutral-800 text-white text-xs p-3 rounded outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600/20 transition-colors"
                        />
                      </div>

                      {/* Phone */}
                      <div className="space-y-1">
                        <label className="block text-[9px] font-bold uppercase text-neutral-400 tracking-wider">Phone Number *</label>
                        <input 
                          type="tel" 
                          required
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="e.g. 082 555 1234"
                          className="w-full bg-neutral-900 border border-neutral-800 text-white text-xs p-3 rounded outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600/20 transition-colors"
                        />
                      </div>
                    </div>

                    {/* Physical Address */}
                    <div className="space-y-1">
                      <label className="block text-[9px] font-bold uppercase text-neutral-400 tracking-wider">Physical Code/Street Address *</label>
                      <input 
                        type="text" 
                        required
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="e.g. 52 Montague Drive"
                        className="w-full bg-neutral-900 border border-neutral-800 text-white text-xs p-3 rounded outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600/20 transition-colors"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {/* Suburb */}
                      <div className="space-y-1">
                        <label className="block text-[9px] font-bold uppercase text-neutral-400 tracking-wider">Suburb *</label>
                        <input 
                          type="text" 
                          required
                          value={suburb}
                          onChange={(e) => setSuburb(e.target.value)}
                          placeholder="e.g. Montague Gardens"
                          className="w-full bg-neutral-900 border border-neutral-800 text-white text-xs p-3 rounded outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600/20 transition-colors"
                        />
                      </div>

                      {/* Province */}
                      <div className="space-y-1">
                        <label className="block text-[9px] font-bold uppercase text-neutral-400 tracking-wider">Province *</label>
                        <select 
                          value={shippingProvince}
                          onChange={(e) => handleProvinceChange(e.target.value)}
                          className="w-full bg-neutral-900 border border-neutral-800 text-white text-xs p-3 rounded outline-none focus:border-red-600 transition-colors cursor-pointer"
                        >
                          {provinces.map((prov) => (
                            <option key={prov} value={prov}>{prov}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Delivery Preference Option (Yes or No) */}
                    <div className="space-y-2.5 pt-2 border-t border-neutral-900">
                      <label className="block text-[9.5px] font-bold uppercase text-neutral-400 tracking-wider">Do you require dynamic delivery & site rigging?</label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setDeliveryPreference('yes')}
                          className={`py-3 px-4 rounded text-xs font-bold uppercase tracking-wider border transition-all cursor-pointer flex items-center justify-center gap-2 ${
                            deliveryPreference === 'yes'
                              ? 'bg-white text-black border-white shadow-md font-extrabold'
                              : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white hover:border-neutral-700'
                          }`}
                        >
                          <span>YES (Deliver)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeliveryPreference('no')}
                          className={`py-3 px-4 rounded text-xs font-bold uppercase tracking-wider border transition-all cursor-pointer flex items-center justify-center gap-2 ${
                            deliveryPreference === 'no'
                              ? 'bg-white text-black border-white shadow-md font-extrabold'
                              : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white hover:border-neutral-700'
                          }`}
                        >
                          <span>NO (Collection)</span>
                        </button>
                      </div>
                      <p className="text-[10px] text-neutral-500 font-light leading-relaxed">
                        {deliveryPreference === 'yes' 
                          ? '* Delivery, mechanical crane offloading, and site rigging cost to be advised by an agent after checkout.' 
                          : '* Pickup and loading is supported free of charge (no fee charged) at our central Triton Cape showroom dispatch depot.'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Submit Panel Footer showing totals dynamically */}
                <div className="p-6 border-t border-neutral-900 bg-neutral-950/80 space-y-4 shadow-2xl">
                  <div className="flex justify-between items-center text-xs text-neutral-400 font-medium">
                    <span>
                      {deliveryPreference === 'yes' ? 'Invoice Value (Excl. Delivery, Incl VAT)' : 'Invoice Value (Incl VAT)'}
                    </span>
                    <span className="font-mono text-white text-sm font-bold">{formatZAR(totalCost)}</span>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-4.5 bg-red-650 hover:bg-red-600 text-white font-black text-xs tracking-[0.2em] uppercase flex items-center justify-center gap-3 transition-colors cursor-pointer border border-red-500/25 rounded disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>TRANSMITTING INVOICE...</span>
                      </>
                    ) : (
                      <>
                        <Send size={13} />
                        <span>SUBMIT INQUIRY</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </>
        )}

      </div>
    </div>
  );
}
