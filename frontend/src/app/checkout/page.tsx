"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ShieldCheck, ChevronDown, ChevronUp, Loader2, Package, Minus, Plus, MapPin } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/lib/shopify/api";

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry",
];

interface AddressForm {
  fullName: string;
  phone: string;
  email: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  pincode: string;
}

const EMPTY_FORM: AddressForm = {
  fullName: "", phone: "", email: "",
  addressLine1: "", addressLine2: "",
  city: "", state: "", pincode: "",
};

function StepBadge({ number }: { number: number }) {
  return (
    <div className="w-6 h-6 rounded-full bg-[#004f54] text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
      {number}
    </div>
  );
}

function InputField({
  label, value, onChange, type = "text", placeholder, required = true, maxLength,
}: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; required?: boolean; maxLength?: number;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-[#6b7280]">
        {label}{required && <span className="text-[#004f54] ml-0.5">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        className="w-full px-4 py-3 rounded-xl border border-[#e5e7eb] bg-white text-[#111827] text-sm placeholder:text-[#d1d5db] focus:outline-none focus:border-[#004f54] focus:ring-2 focus:ring-[#004f54]/10 transition-all"
      />
    </div>
  );
}

export default function CheckoutPage() {
  const router = useRouter();
  const { cart, cartReady, updateItem } = useCart();
  const [form, setForm] = useState<AddressForm>(EMPTY_FORM);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [errors, setErrors] = useState<Partial<AddressForm>>({});
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [pincodeDetected, setPincodeDetected] = useState(false);

  function set(field: keyof AddressForm) {
    return (value: string) => {
      setForm(prev => ({ ...prev, [field]: value }));
      if (errors[field]) setErrors(prev => ({ ...prev, [field]: undefined }));
    };
  }

  async function handlePincodeChange(value: string) {
    set("pincode")(value);
    setPincodeDetected(false);
    if (!/^\d{6}$/.test(value)) return;
    setPincodeLoading(true);
    try {
      const res = await fetch(`https://api.postalpincode.in/pincode/${value}`);
      const data = await res.json() as Array<{ Status: string; PostOffice?: Array<{ District: string; State: string; Name: string }> }>;
      const post = data?.[0];
      if (post?.Status === "Success" && post.PostOffice?.length) {
        const { District, State } = post.PostOffice[0];
        setForm(prev => ({
          ...prev,
          pincode: value,
          city: prev.city || District,
          state: prev.state || State,
        }));
        setPincodeDetected(true);
        setErrors(prev => ({ ...prev, city: undefined, state: undefined, pincode: undefined }));
      }
    } catch { /* non-critical */ }
    finally { setPincodeLoading(false); }
  }

  function validate(): boolean {
    const e: Partial<AddressForm> = {};
    if (!form.fullName.trim()) e.fullName = "Please enter your full name";
    if (!/^[6-9]\d{9}$/.test(form.phone)) e.phone = "Enter a valid 10-digit mobile number";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Enter a valid email address";
    if (!form.addressLine1.trim()) e.addressLine1 = "Please enter your address";
    if (!form.city.trim()) e.city = "Please enter your city";
    if (!form.state) e.state = "Please select your state";
    if (!/^\d{6}$/.test(form.pincode)) e.pincode = "Enter a valid 6-digit pincode";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleProceed() {
    if (!validate()) return;
    alert("Payment integration coming soon.");
  }

  if (!cartReady) return (
    <div className="min-h-screen flex items-center justify-center bg-[#f9fafb]">
      <Loader2 size={28} className="animate-spin text-[#004f54]" />
    </div>
  );

  if (!cart || cart.items.length === 0) return null;

  const subtotal = parseFloat(cart.subtotal?.amount ?? "0");
  const shipping = subtotal >= 499 ? 0 : 49;
  const total = subtotal + shipping;

  return (
    <div className="min-h-screen bg-[#f4f6f5]">

      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-[#e5e7eb] px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#f3f4f6] transition-colors"
        >
          <ArrowLeft size={20} className="text-[#374151]" />
        </button>
        <div className="flex-1">
          <p className="text-[10px] font-bold text-[#004f54] tracking-widest uppercase">BetterHalf</p>
          <h1 className="text-base font-extrabold text-[#111827] leading-none">Checkout</h1>
        </div>
        <div className="flex items-center gap-1.5 bg-green-50 text-green-700 text-xs font-bold px-3 py-1.5 rounded-full border border-green-200">
          <ShieldCheck size={12} />
          Secure
        </div>
      </header>

      {/* Steps indicator */}
      <div className="bg-white border-b border-[#e5e7eb] px-5 py-3">
        <div className="flex items-center gap-2 max-w-lg mx-auto">
          {[["Contact", 1], ["Delivery", 2], ["Payment", 3]].map(([label, num], i) => (
            <div key={num} className="flex items-center gap-2 flex-1">
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-full bg-[#004f54] text-white text-[10px] font-bold flex items-center justify-center">{num}</div>
                <span className="text-[11px] font-semibold text-[#004f54]">{label}</span>
              </div>
              {i < 2 && <div className="flex-1 h-px bg-[#e5e7eb]" />}
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-3">

        {/* Order Summary */}
        <div className="bg-white rounded-2xl border border-[#e5e7eb] overflow-hidden shadow-sm">
          <button
            onClick={() => setSummaryOpen(p => !p)}
            className="w-full flex items-center justify-between px-4 py-3.5"
          >
            <div className="flex items-center gap-2">
              <Package size={15} className="text-[#004f54]" />
              <span className="text-sm font-bold text-[#111827]">
                {cart.totalQuantity} {cart.totalQuantity === 1 ? "item" : "items"} in your order
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-extrabold text-[#004f54]">₹{total.toLocaleString("en-IN")}</span>
              {summaryOpen
                ? <ChevronUp size={15} className="text-[#9ca3af]" />
                : <ChevronDown size={15} className="text-[#9ca3af]" />}
            </div>
          </button>

          {summaryOpen && (
            <div className="border-t border-[#f3f4f6]">
              <ul className="divide-y divide-[#f9fafb]">
                {cart.items.map(item => (
                  <li key={item.lineId} className="flex items-center gap-3 px-4 py-3">
                    {item.image && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.image.url}
                        alt={item.productTitle}
                        className="w-14 h-14 rounded-xl object-cover bg-[#f3f4f6] flex-shrink-0 border border-[#f3f4f6]"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#111827] line-clamp-2 leading-snug">{item.productTitle}</p>
                      {item.variantTitle !== "Default Title" && (
                        <p className="text-xs text-[#9ca3af] mt-0.5">{item.variantTitle}</p>
                      )}
                      <p className="text-sm font-bold text-[#004f54] mt-1">{formatPrice(item.lineTotal)}</p>
                    </div>
                    {/* Quantity controls */}
                    <div className="flex items-center border border-[#e5e7eb] rounded-xl overflow-hidden flex-shrink-0">
                      <button
                        onClick={() => updateItem(item.lineId, Math.max(1, item.quantity - 1))}
                        className="w-8 h-8 flex items-center justify-center text-[#004f54] hover:bg-[#f0f5f5] transition-colors"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="w-7 text-center text-sm font-bold text-[#111827]">{item.quantity}</span>
                      <button
                        onClick={() => updateItem(item.lineId, item.quantity + 1)}
                        className="w-8 h-8 flex items-center justify-center text-[#004f54] hover:bg-[#f0f5f5] transition-colors"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>

              {/* Price breakdown */}
              <div className="px-4 py-3 space-y-2 border-t border-[#f3f4f6] bg-[#fafafa]">
                <div className="flex justify-between text-sm text-[#6b7280]">
                  <span>Subtotal</span>
                  <span>₹{subtotal.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#6b7280]">Shipping</span>
                  <span className={shipping === 0 ? "text-green-600 font-semibold" : "text-[#6b7280]"}>
                    {shipping === 0 ? "Free" : `₹${shipping}`}
                  </span>
                </div>
                {shipping > 0 && (
                  <p className="text-[11px] text-[#9ca3af]">Add ₹{499 - subtotal} more for free shipping</p>
                )}
                <div className="flex justify-between text-sm font-bold text-[#111827] pt-1.5 border-t border-[#e5e7eb]">
                  <span>Total</span>
                  <span>₹{total.toLocaleString("en-IN")}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Contact Information */}
        <div className="bg-white rounded-2xl border border-[#e5e7eb] px-4 py-5 shadow-sm">
          <div className="flex items-center gap-2.5 mb-5">
            <StepBadge number={1} />
            <h2 className="text-sm font-extrabold text-[#111827]">Contact Information</h2>
          </div>
          <div className="space-y-4">
            <InputField label="Full name" value={form.fullName} onChange={set("fullName")} placeholder="Enter your full name" />
            {errors.fullName && <p className="text-xs text-red-500 -mt-2">{errors.fullName}</p>}

            <InputField label="Mobile number" value={form.phone} onChange={set("phone")} type="tel" placeholder="10-digit mobile number" maxLength={10} />
            {errors.phone && <p className="text-xs text-red-500 -mt-2">{errors.phone}</p>}

            <InputField label="Email address" value={form.email} onChange={set("email")} type="email" placeholder="your@email.com" />
            {errors.email && <p className="text-xs text-red-500 -mt-2">{errors.email}</p>}
          </div>
        </div>

        {/* Delivery Address */}
        <div className="bg-white rounded-2xl border border-[#e5e7eb] px-4 py-5 shadow-sm">
          <div className="flex items-center gap-2.5 mb-5">
            <StepBadge number={2} />
            <h2 className="text-sm font-extrabold text-[#111827]">Delivery Address</h2>
          </div>
          <div className="space-y-4">
            <InputField label="Address line 1" value={form.addressLine1} onChange={set("addressLine1")} placeholder="House no, Building, Street, Area" />
            {errors.addressLine1 && <p className="text-xs text-red-500 -mt-2">{errors.addressLine1}</p>}

            <InputField label="Address line 2 (optional)" value={form.addressLine2} onChange={set("addressLine2")} placeholder="Landmark, Apartment, Floor" required={false} />

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <InputField label="City" value={form.city} onChange={set("city")} placeholder="City" />
                {errors.city && <p className="text-xs text-red-500">{errors.city}</p>}
              </div>
              <div className="space-y-1">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-[#6b7280]">Pincode<span className="text-[#004f54] ml-0.5">*</span></label>
                  <div className="relative">
                    <input
                      type="tel"
                      value={form.pincode}
                      onChange={e => handlePincodeChange(e.target.value)}
                      placeholder="6-digit pincode"
                      maxLength={6}
                      className="w-full px-4 py-3 rounded-xl border border-[#e5e7eb] bg-white text-[#111827] text-sm placeholder:text-[#d1d5db] focus:outline-none focus:border-[#004f54] focus:ring-2 focus:ring-[#004f54]/10 transition-all pr-8"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {pincodeLoading && <Loader2 size={13} className="animate-spin text-[#004f54]" />}
                      {pincodeDetected && !pincodeLoading && <MapPin size={13} className="text-green-500" />}
                    </div>
                  </div>
                </div>
                {errors.pincode && <p className="text-xs text-red-500">{errors.pincode}</p>}
                {pincodeDetected && <p className="text-[11px] text-green-600 font-medium flex items-center gap-1"><MapPin size={10} /> City and state auto-filled</p>}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#6b7280]">
                State<span className="text-[#004f54] ml-0.5">*</span>
              </label>
              <select
                value={form.state}
                onChange={e => set("state")(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-[#e5e7eb] bg-white text-sm text-[#111827] focus:outline-none focus:border-[#004f54] focus:ring-2 focus:ring-[#004f54]/10 transition-all"
              >
                <option value="">Select your state</option>
                {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              {errors.state && <p className="text-xs text-red-500">{errors.state}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#6b7280]">Country</label>
              <div className="w-full px-4 py-3 rounded-xl border border-[#e5e7eb] bg-[#fafafa] text-sm text-[#9ca3af] flex items-center gap-2">
                <span>🇮🇳</span> India
              </div>
            </div>
          </div>
        </div>

        {/* Payment */}
        <div className="bg-white rounded-2xl border border-[#e5e7eb] px-4 py-5 shadow-sm">
          <div className="flex items-center gap-2.5 mb-4">
            <StepBadge number={3} />
            <h2 className="text-sm font-extrabold text-[#111827]">Payment</h2>
          </div>

          <div className="rounded-xl border-2 border-[#004f54]/20 bg-[#004f54]/[0.03] p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#004f54] flex items-center justify-center flex-shrink-0">
                <ShieldCheck size={18} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-[#111827]">Pay via Razorpay</p>
                <p className="text-xs text-[#6b7280] mt-0.5">UPI · Credit/Debit Card · Net Banking · Wallets</p>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[#004f54]/10">
              {["UPI", "Visa", "Mastercard", "PayTM", "GPay"].map(m => (
                <span key={m} className="text-[10px] font-bold text-[#6b7280] bg-white border border-[#e5e7eb] px-2 py-1 rounded-md">{m}</span>
              ))}
            </div>
          </div>

          <p className="text-[11px] text-[#9ca3af] text-center mt-3 flex items-center justify-center gap-1">
            <ShieldCheck size={10} className="text-green-500" />
            256-bit SSL encrypted. Your payment is 100% secure.
          </p>
        </div>

        {/* Price Summary */}
        <div className="bg-white rounded-2xl border border-[#e5e7eb] px-4 py-4 shadow-sm">
          <div className="space-y-2.5">
            <div className="flex justify-between text-sm text-[#6b7280]">
              <span>Subtotal ({cart.totalQuantity} {cart.totalQuantity === 1 ? "item" : "items"})</span>
              <span>₹{subtotal.toLocaleString("en-IN")}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[#6b7280]">Shipping</span>
              <span className={shipping === 0 ? "text-green-600 font-semibold" : "text-[#6b7280]"}>
                {shipping === 0 ? "Free" : `₹${shipping}`}
              </span>
            </div>
            <div className="flex justify-between font-extrabold text-[#111827] pt-2.5 border-t border-[#f3f4f6]">
              <span>Total Payable</span>
              <span className="text-[#004f54]">₹{total.toLocaleString("en-IN")}</span>
            </div>
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={handleProceed}
          className="w-full py-4 bg-[#004f54] text-white rounded-2xl font-extrabold text-base flex items-center justify-center gap-2 hover:bg-[#01696f] active:scale-[0.98] transition-all shadow-lg shadow-[#004f54]/25"
        >
          Pay ₹{total.toLocaleString("en-IN")} Securely →
        </button>

        {/* Trust badges */}
        <div className="flex items-center justify-center gap-5 py-1">
          {[["✓", "100% Secure"], ["✓", "Easy Returns"], ["✓", "Genuine Products"]].map(([icon, label]) => (
            <div key={label} className="flex items-center gap-1 text-[11px] font-medium text-[#6b7280]">
              <span className="text-[#004f54] font-bold">{icon}</span> {label}
            </div>
          ))}
        </div>

        <p className="text-center text-[11px] text-[#9ca3af] pb-6">
          By placing this order you agree to our{" "}
          <span className="text-[#004f54] underline cursor-pointer">Terms & Conditions</span>
        </p>
      </div>
    </div>
  );
}
