import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { stripePromise } from "./stripe";

// type StoredUser = {
//   name: string;
//   email: string;
//   password: string;
// };

// const USERS_KEY = "affiliate_users";
// const SESSION_KEY = "affiliate_session";

export default function VideoForm() {
  type PlanId = "free" | "growth" | "scale";
  type PlanConfig = {
    id: PlanId;
    name: string;
    amount: number;
    currency: string;
    interval: "monthly";
    tokens: number;
  };

  const PLAN_CONFIGS: Record<PlanId, PlanConfig> = {
    free: {
      id: "free",
      name: "Free",
      amount: 0,
      currency: "USD",
      interval: "monthly",
      tokens: 5,
    },
    growth: {
      id: "growth",
      name: "Growth",
      amount: 9.9,
      currency: "USD",
      interval: "monthly",
      tokens: 100,
    },
    scale: {
      id: "scale",
      name: "Scale",
      amount: 14.99,
      currency: "USD",
      interval: "monthly",
      tokens: 1000,
    },
  };

  const [productPics, setProductPics] = useState<File[]>([]);
  const [cta_text, setCtaText] = useState<string>("");
  const [isSecondCta, setIsSecondCta] = useState<boolean>(false);
  const [secondCtaText, setSecondCtaText] = useState<string>("");
  const [musicFile, setMusicFile] = useState<File | null>(null);
  const [problemMedia, setProblemMedia] = useState<File[]>([]);
  const [productTitle, setProductTitle] = useState<string>("");
  const [productDescription, setProductDescription] = useState<string>("");
  const [stayLoggedIn, setStayLoggedIn] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showVerifyPanel, setShowVerifyPanel] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationEmail, setVerificationEmail] = useState("");
  const [currentUserEmail, setCurrentUserEmail] = useState("");


  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authName, setAuthName] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUserName, setCurrentUserName] = useState("");
  const [showAuthPanel, setShowAuthPanel] = useState(false);
  const [showUpgradePanel, setShowUpgradePanel] = useState(false);
  const [upgradingPlanId, setUpgradingPlanId] = useState<PlanId | null>(null);
  const [tokensLeft, setTokensLeft] = useState<number | null>(null);
  const [userPlan, setUserPlan] = useState<number>(0);

  const API_BASE = "https://affiliate-bot-gd9j.onrender.com";


  const picsCount = productPics.length;
  const extractTokens = (data: unknown): number | null => {
    if (!data || typeof data !== "object") return null;
    const source = data as Record<string, unknown>;
    const directCandidates = [
      source.tokens,
    ];

    for (const value of directCandidates) {
      if (typeof value === "number" && Number.isFinite(value)) {
        return value;
      }
    }

    return null;
  };

  const syncSession = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/session`, {
        credentials: "include",
      });

      if (!res.ok) {
        console.error("Failed to fetch session");
        setIsAuthenticated(false);
        setCurrentUserName("");
        setCurrentUserEmail("");
        setTokensLeft(null);
        setUserPlan(0);
        return;
      }

      const data = await res.json();
      if (data.loggedIn) {
        setIsAuthenticated(true);
        setCurrentUserName(data.name || "");
        setCurrentUserEmail(data.email || "");
        setTokensLeft(extractTokens(data));
        setUserPlan(data.plan || 0);
      } else {
        setIsAuthenticated(false);
        setCurrentUserName("");
        setCurrentUserEmail("");
        setTokensLeft(null);
        setUserPlan(0);
      }
    } catch (err) {
      console.error("Error fetching session:", err);
      setIsAuthenticated(false);
      setCurrentUserName("");
      setCurrentUserEmail("");
      setTokensLeft(null);
    }
  };

  useEffect(() => {
    syncSession();
  }, []);


  const handleVerifySubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!verificationCode.trim()) {
      alert("Enter verification code");
      return;
    }

    const formData = new FormData();
    formData.append("email", verificationEmail);
    formData.append("code", verificationCode.trim());

    try {
      const res = await fetch(`${API_BASE}/api/verify`, {
        method: "POST",
        body: formData
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.detail || "Verification failed");
        return;
      }

      alert("Account verified! Please login.");

      setShowVerifyPanel(false);
      setShowAuthPanel(true);
      setVerificationCode("");

    } catch {
      alert("Network error");
    }
  };



  const handleAuthSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const email = authEmail.trim().toLowerCase();
    const password = authPassword.trim();
    const name = authName.trim();

    if (!email || !password || (authMode === "register" && !name)) {
      alert("Please fill all required fields.");
      return;
    }

    const authData = new FormData();
    authData.append("email", email);
    authData.append("password", password);
    if (authMode === "register") authData.append("name", name);
    authData.append("authmode", authMode);
    authData.append("stayLoggedIn", stayLoggedIn ? "true" : "false");

    try {
      const res = await fetch(`${API_BASE}/api/auth`, {
        method: "POST",
        body: authData,
        credentials: "include"
      });

      if (!res.ok) {
        const errorData = await res.json();
        alert(errorData.detail || "Authentication failed");
        return;
      }

      const data = await res.json();

      if (data.requires_verification) {
        setVerificationEmail(data.email);
        setShowAuthPanel(false);
        setShowVerifyPanel(true);
        return;
      }

      if (authMode === "register") {
        setVerificationEmail(email);
        setShowAuthPanel(false);
        setShowVerifyPanel(true);
        return;
      }

      alert(data.message || "Success");

      setIsAuthenticated(true);
      setCurrentUserEmail(data.email || email);
      if (data.name) {
        setCurrentUserName(data.name);
      }
      setTokensLeft(extractTokens(data));
      await syncSession();
      setShowAuthPanel(false);
      setAuthPassword("");
      setAuthEmail("");
      setAuthName("");

    } catch (err) {
      console.error(err);
      alert("Network error");
    }
  };


  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE}/api/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch (err) {
      console.error(err);
    }

    setIsAuthenticated(false);
    setCurrentUserName("");
    setCurrentUserEmail("");
    setTokensLeft(null);
    alert("Logged out successfully!");
  };

  const handleUpgrade = () => {
    setShowUpgradePanel(true);
  };

  const closeUpgradePanel = () => {
    setShowUpgradePanel(false);
  };

  const handlePlanUpgrade = async (planId: PlanId) => {
    if (upgradingPlanId) return;
    if (!isAuthenticated || !currentUserEmail.trim()) {
      setShowUpgradePanel(false);
      setShowAuthPanel(true);
      alert("Please login before upgrading your plan.");
      return;
    }

    const selectedPlan = PLAN_CONFIGS[planId];

    try {
      setUpgradingPlanId(planId);
      const res = await fetch(`${API_BASE}/api/upgrade`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          plan: selectedPlan,
          payment: {
            amount: selectedPlan.amount,
            currency: selectedPlan.currency,
            interval: selectedPlan.interval,
          },
          user: {
            email: currentUserEmail,
            name: currentUserName,
            currentPlan: userPlan,
          },
          source: "upgrade_modal",
          requestedAt: new Date().toISOString(),
        }),
      });

      const contentType = res.headers.get("content-type") || "";
      const data: Record<string, unknown> = contentType.includes("application/json")
        ? await res.json()
        : {};

      if (!res.ok) {
        const errorMessage =
          (typeof data.detail === "string" && data.detail) ||
          (typeof data.message === "string" && data.message) ||
          "Failed to create checkout session.";
        throw new Error(errorMessage);
      }

      const checkoutUrl =
        (typeof data.checkoutUrl === "string" && data.checkoutUrl) ||
        (typeof data.checkout_url === "string" && data.checkout_url) ||
        (typeof data.url === "string" && data.url);

      if (checkoutUrl) {
        window.location.assign(checkoutUrl);
        return;
      }

      const sessionId =
        (typeof data.sessionId === "string" && data.sessionId) ||
        (typeof data.session_id === "string" && data.session_id) ||
        (typeof data.id === "string" && data.id);

      if (sessionId) {
        const stripe = await stripePromise;
        if (!stripe) throw new Error("Stripe failed to initialize.");
        const redirectToCheckout = (stripe as unknown as {
          redirectToCheckout?: (params: { sessionId: string }) => Promise<{ error?: { message?: string } }>;
        }).redirectToCheckout;
        if (typeof redirectToCheckout !== "function") {
          throw new Error("Stripe redirectToCheckout is not available in this Stripe SDK version.");
        }
        const result = await redirectToCheckout({ sessionId });
        if (result.error?.message) throw new Error(result.error.message);
        return;
      }

      throw new Error("No checkout redirect target returned by /api/upgrade.");
    } catch (err) {
      console.error(err);
      if (err instanceof Error && err.message) {
        alert(err.message);
      } else {
        alert("Upgrade failed.");
      }
    } finally {
      setUpgradingPlanId(null);
    }
  };


  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();



    if (isLoading) return;

    if (musicFile && !["audio/wav", "audio/mpeg"].includes(musicFile.type)) {
      alert("Music file must be WAV or MP3.");
      return;
    }

    const invalidProblemMedia = problemMedia.find(file => {
      const mime = file.type.toLowerCase();
      return !mime.startsWith("video/");
    });
    if (invalidProblemMedia) {
      alert("Problem media must be a video file.");
      return;
    }

    if (!productTitle.trim()) {
      alert("Please enter a product title.");
      return;
    }

    if (!productDescription.trim()) {
      alert("Please enter a product description.");
      return;
    }

    if (isAuthenticated && !currentUserEmail.trim()) {
      setShowAuthPanel(true);
      alert("Please log in to continue.");
      return;
    }

    const formData = new FormData();
    productPics.forEach(file => formData.append("product_pics", file));
    if (musicFile) formData.append("music_file", musicFile);
    problemMedia.forEach(file => formData.append("problem_video", file));
    formData.append("title", productTitle);
    formData.append("description", productDescription);
    formData.append("user_email", isAuthenticated ? currentUserEmail : "");
    formData.append("stayLoggedIn", stayLoggedIn ? "true" : "false");
    formData.append("cta_text", cta_text);
    formData.append("isSecondCta", isSecondCta ? "true" : "false");
    formData.append("second_cta_text", isSecondCta ? secondCtaText.trim() : "");

    try {
      if (isAuthenticated) {
        setIsLoading(true);

        const res = await fetch(`${API_BASE}/api/generate-video`, {
          method: "POST",
          body: formData,
          credentials: "include",
        });

        const contentType = res.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          const data = await res.json();
          if (data.error === "User not verified.") {
            setShowVerifyPanel(true);
          }
          if (typeof data?.error === "string") {
            if (data.error === "User email is required.") {
              setShowAuthPanel(true);
            }
            throw new Error(data.error);
          }
          throw new Error("Unexpected JSON response from server.");
        }

        if (!res.ok) {
          const contentType = res.headers.get("content-type") || "";

          if (contentType.includes("application/json")) {
            const err = await res.json();
            console.log("SERVER JSON:", err);

            if (err.detail?.error) {
              throw new Error(err.detail.error);
            }
            if (err.detail?.trace) {
              console.error("Backend Trace:", err.detail.trace);
            }

            if (typeof err.detail === "string") {
              throw new Error(err.detail);
            }
          }

          const text = await res.text();
          throw new Error(text || "Unknown server error");
        }

        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "generated_video.mp4";
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);

        alert("Video generated successfully!");
        setTokensLeft(prev => (typeof prev === "number" ? Math.max(0, prev - 1) : prev));
      } else {
        setShowAuthPanel(true)
      }
    } catch (err) {
      console.error(err);
      console.log("Error details:", err instanceof Error ? { message: err.message, stack: err.stack } : err);
      if (err instanceof Error && err.message && err.message !== "User email is required.") {
        alert(err.message);
      } else {
        alert("Error generating video.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="bg-orb orb-1" />
      <div className="bg-orb orb-2" />
      <header className="hero">
        <div className="topbar">
          <div className="brand">
            <span className="brand-dot" />
            <span>AutoAd video studio</span>
          </div>
          <div className="topbar-actions">
            {isAuthenticated && (
              <div className="session-box">
                <span>{currentUserName}</span>
                <button type="button" className="ghost" onClick={handleLogout}>
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>

        <h1>Generate high-impact product videos</h1>
        <p>
          {isAuthenticated
            ? "Upload your assets and let the generator craft a polished MP4 ready for campaigns."
            : "Upload your assets and generate a video. If account access is required, you'll be prompted automatically."}
        </p>
        {!isAuthenticated && (
          <div className="hero-actions">
            <button type="button" className="ghost auth-toggle" onClick={() => setShowAuthPanel(true)}>
              Login / Register
            </button>
          </div>
        )}
      </header>

      {!isAuthenticated && showVerifyPanel ? (
        <form className="card auth-card" onSubmit={handleVerifySubmit}>
          <div className="section-head">
            <h2>Email Verification</h2>
            <span className="badge">Required</span>
          </div>

          <div className="grid auth-grid">
            <label className="field">
              <span className="label">Verification Code</span>
              <input
                type="text"
                placeholder="Enter code from email"
                value={verificationCode}
                onChange={e => setVerificationCode(e.target.value)}
              />
            </label>
          </div>

          <div className="footer">
            <button type="submit" className="primary">
              Verify Account
            </button>
          </div>
        </form>
      ) : !isAuthenticated && showAuthPanel ? (

        <form className="card auth-card" onSubmit={handleAuthSubmit}>
          <div className="section-head">
            <h2>Account Access</h2>
            <span className="badge">Required</span>
          </div>

          <div className="tabs">
            <button
              type="button"
              className={authMode === "login" ? "tab active" : "tab"}
              onClick={() => setAuthMode("login")}
            >
              Login
            </button>
            <button
              type="button"
              className={authMode === "register" ? "tab active" : "tab"}
              onClick={() => setAuthMode("register")}
            >
              Register
            </button>
          </div>

          <div className="grid auth-grid">
            {authMode === "register" && (
              <label className="field">
                <span className="label">Name</span>
                <input
                  type="text"
                  placeholder="John Doe"
                  value={authName}
                  onChange={e => setAuthName(e.target.value)}
                />
              </label>
            )}

            <label className="field">
              <span className="label">Email</span>
              <input
                type="email"
                placeholder="you@example.com"
                value={authEmail}
                onChange={e => setAuthEmail(e.target.value)}
              />
            </label>

            <label className="field">
              <span className="label">Password</span>
              <input
                type="password"
                placeholder="********"
                value={authPassword}
                onChange={e => setAuthPassword(e.target.value)}
              />
            </label>
          </div>

          <label>
            <input
              type="checkbox"
              checked={stayLoggedIn}
              onChange={e => setStayLoggedIn(e.target.checked)}
            />
            <span className="label">Stay logged in?</span>
          </label>

          <div className="footer">
            <div className="summary">
              <div>
                <span className="summary-label">Access</span>
                <span className="summary-value">Login or create account to continue</span>
              </div>
            </div>
            <button type="submit" className="primary">
              {authMode === "login" ? "Login" : "Create Account"}
            </button>
          </div>
        </form>
      ) : (
        <form className="card" onSubmit={handleSubmit}>
          <div className="section-head">
            <h2>Project Inputs</h2>
            <div className="section-actions">
              <span className="badge">
                {typeof tokensLeft === "number" ? `${tokensLeft} Tokens left` : "Tokens left: --"}
              </span>
              <button type="button" className="upgrade-btn" onClick={handleUpgrade}>
                Upgrade
              </button>
            </div>
          </div>

          <div className="grid">
            <label className="field">
              <span className="label">Product Images</span>
              <span className="hint">6 or more JPGs optimal</span>
              <div className="file">
                <input
                  type="file"
                  multiple
                  accept=".jpg,.jpeg,.png"
                  onChange={e => setProductPics(Array.from(e.target.files || []))}
                />
                <div className="file-ui">
                  <span>Choose files</span>
                  <span className="file-meta">{picsCount} selected</span>
                </div>
              </div>
            </label>

            <label className="field">
              <span className="label">Music File</span>
              <span className="hint">WAV or MP3 - optimal background audio - uses default if not uploaded</span>
              <div className="file">
                <input
                  type="file"
                  accept=".wav,.mp3"
                  onChange={e => setMusicFile(e.target.files?.[0] || null)}
                />
                <div className="file-ui">
                  <span>{musicFile ? musicFile.name : "Choose file"}</span>
                  <span className="file-meta">Audio track</span>
                </div>
              </div>
            </label>

            <label className="field">
              <span className="label">Problem Media</span>
              <span className="hint">These files should depict the problem which persists when not having your product. 1-3 files recommended</span>
              <div className="file">
                <input
                  type="file"
                  multiple
                  accept="video/*"
                  onChange={e => setProblemMedia(Array.from(e.target.files || []))}
                />
                <div className="file-ui">
                  <span>Choose files</span>
                  <span className="file-meta">{problemMedia.length} selected</span>
                </div>
              </div>
            </label>

            <label className="field">
              <span className="label">Product Title</span>
              <span className="hint">Short, punchy headline</span>
              <input
                type="text"
                placeholder="Curex smartwatch"
                value={productTitle}
                onChange={e => setProductTitle(e.target.value)}
              />
            </label>

            <label className="field">
              <span className="label">Product Description</span>
              <span className="hint">Four or more bullet points ideal</span>
              <input
                type="text"
                placeholder="It tracks your health, monitors sleep, logs nutrition and workout and syncs with your phone."
                value={productDescription}
                onChange={e => setProductDescription(e.target.value)}
              />
            </label>

            <label className="field premium">
              <span className="label">CTA text</span>
              <span className="hint">Uses "link in bio" as default</span>
              <input
                type="text"
                placeholder="Grab yours now"
                value={cta_text}
                onChange={e => setCtaText(e.target.value)}
                className="premium"
                disabled={userPlan === 1}
              />
              <span className="tooltiptext">Only available in Growth and Scale plans</span>
            </label>

            <label className="field">
              <span className="label">Second CTA</span>
              <span className="hint">More subtle CTA text</span>
              <input
                type="checkbox"
                checked={isSecondCta}
                onChange={e => setIsSecondCta(e.target.checked)}
              />
              {isSecondCta && (
                <input
                  type="text"
                  placeholder="Out of stock soon"
                  value={secondCtaText}
                  onChange={e => setSecondCtaText(e.target.value)}
                />
              )}
            </label>
          </div>

          <div className="footer">
            <div className="summary">
              <div>
                <span className="summary-label">Status</span>
                <span className="summary-value">
                  {picsCount} images, {musicFile ? "audio" : "no audio"}, {problemMedia.length} problem media
                </span>
              </div>
            </div>
            <button type="submit" className="primary" disabled={isLoading}>
              {isLoading ? "Generating..." : "Generate Video"}
            </button>
          </div>
        </form>
      )}

      {showUpgradePanel && (
        <div className="upgrade-overlay" role="dialog" aria-modal="true" aria-label="Upgrade Plans">
          <div className="upgrade-panel">
            <button
              type="button"
              className="upgrade-close"
              onClick={closeUpgradePanel}
              aria-label="Close upgrade panel"
            >
              x
            </button>

            <div className="upgrade-head">
              <span className="upgrade-kicker">Scale Faster</span>
              <h3>Choose your AutoAd plan</h3>
              <p>Unlock more tokens for maximum production</p>
            </div>

            <div className="plans">
              <article className="plan-card">
                <h4>Free</h4>
                <p className="plan-price">$0<span>/mo</span></p>
                <ul className="plan-features">
                  <li>5 tokens monthly</li>
                  <li>Standard voice quality</li>
                  <li>Watermark</li>
                </ul>
                <button
                  type="button"
                  className="plan-btn"
                  onClick={() => handlePlanUpgrade("free")}
                  disabled={upgradingPlanId !== null}
                >
                  Choose Free
                </button>
              </article>

              <article className="plan-card featured">
                <span className="plan-badge">Most Popular</span>
                <h4>Growth</h4>
                <p className="plan-price">$9.90<span>/mo</span></p>
                <ul className="plan-features">
                  <li>100 tokens monthly</li>
                  <li>More to come</li>
                  <li>More to come</li>
                </ul>
                <button
                  type="button"
                  className="plan-btn plan-btn-primary"
                  onClick={() => handlePlanUpgrade("growth")}
                  disabled={upgradingPlanId !== null}
                >
                  Choose Growth
                </button>
              </article>

              <article className="plan-card">
                <h4>Scale</h4>
                <p className="plan-price">$14.99<span>/mo</span></p>
                <ul className="plan-features">
                  <li>1,000 tokens monthly</li>
                  <li>More to come</li>
                  <li>More to come</li>
                </ul>
                <button
                  type="button"
                  className="plan-btn"
                  onClick={() => handlePlanUpgrade("scale")}
                  disabled={upgradingPlanId !== null}
                >
                  Choose Scale
                </button>
              </article>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @import url("https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap");

        html, body {
          width: 100%;
          height: 100%;
          margin: 0;
          padding: 0;
          overflow-x: hidden;
          overflow-y: auto;
          background: #0b0b0f;
          color: #e1e1ee;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .premium:hover {
          cursor: not-allowed;
        }
        .tooltiptext {
          visibility: hidden; /* Hidden by default */
          width: 130px;
          background-color: black;
          color: #ffffff;
          text-align: center;
          padding: 5px 0;
          border-radius: 6px;
          position: absolute;
          z-index: 1; /* Ensure tooltip is displayed above content */
        }


        .premium:active .tooltiptext {
          visibility: visible;
        }

        .page {
          width: 100%;
          min-height: 100vh;
          padding: 100px 0 0;
          position: relative;
          box-sizing: border-box;
        }

        .bg-orb {
          position: absolute;
          width: 520px;
          height: 520px;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.35;
          animation: float 12s ease-in-out infinite;
          pointer-events: none;
          overflow: visible;
        }

        .orb-1 {
          background: radial-gradient(circle, #4aa8ff, transparent 65%);
          top: -180px;
          left: -140px;
        }

        .orb-2 {
          background: radial-gradient(circle, #ff6d6d, transparent 65%);
          bottom: -200px;
          right: -120px;
          animation-delay: 3s;
        }

        .hero {
          max-width: none;
          width: 100%;
          margin: 0 auto 32px;
          text-align: left;
          animation: rise 0.8s ease forwards;
        }

        .topbar {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: nowrap;
          gap: 12px;
          padding: 8px 12px;
        }

        .topbar-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          margin-left: auto;
          min-height: 40px;
        }

        .brand {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          font-size: 14px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: #a0a0b3;
          margin-bottom: 0;
        }

        .session-box {
          display: flex;
          align-items: right;
          gap: 12px;
          font-size: 13px;
          color: #d7d7e5;
          margin-bottom: 0;
          width: max-content;
        }

        .brand-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: linear-gradient(120deg, #3d8bff, #ff6d6d);
          box-shadow: 0 0 14px rgba(61, 139, 255, 0.6);
        }

        .hero h1 {
          font-size: clamp(28px, 4vw, 44px);
          margin: 0 0 12px;
        }

        .hero p {
          font-size: 16px;
          color: #b7b7c8;
          margin: 0;
        }

        .hero-actions {
          margin-top: 16px;
          display: flex;
          align-items: center;
        }

        .card {
          max-width: none;
          width: 100%;
          margin: 0 auto;
          background: rgba(20, 20, 28, 0.92);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 24px;
          padding: 28px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(12px);
          animation: fadeIn 0.8s ease 0.15s forwards;
        }

        .auth-card {
          max-width: 760px;
        }

        .section-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 24px;
          gap: 12px;
        }

        .section-head h2 {
          font-size: 20px;
          margin: 0;
        }

        .section-actions {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        .badge {
          font-size: 12px;
          color: #c6d6ff;
          background: rgba(61, 139, 255, 0.18);
          border: 1px solid rgba(61, 139, 255, 0.4);
          padding: 6px 10px;
          border-radius: 999px;
        }

        .upgrade-btn {
          border: 1px solid rgba(255, 109, 109, 0.45);
          background: linear-gradient(135deg, rgba(255, 109, 109, 0.18), rgba(61, 139, 255, 0.18));
          color: #ffe7e7;
          border-radius: 999px;
          padding: 7px 14px;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.03em;
          cursor: pointer;
          transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
        }

        .upgrade-btn:hover {
          transform: translateY(-1px);
          border-color: rgba(255, 109, 109, 0.8);
          box-shadow: 0 8px 20px rgba(255, 109, 109, 0.22);
        }

        .tabs {
          display: inline-flex;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          padding: 4px;
          margin-bottom: 18px;
          gap: 4px;
        }

        .tab {
          border: none;
          border-radius: 8px;
          color: #b9b9ca;
          background: transparent;
          padding: 8px 12px;
          cursor: pointer;
        }

        .tab.active {
          background: rgba(61, 139, 255, 0.22);
          color: #e4ebff;
        }

        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 20px;
        }

        .auth-grid {
          grid-template-columns: 1fr;
          max-width: 520px;
        }

        .field {
          display: flex;
          flex-direction: column;
          gap: 8px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 16px;
          padding: 16px;
          transition: border 0.25s ease, transform 0.25s ease;
        }

        .field:hover:not(.premium) {
          border-color: rgba(255, 255, 255, 0.18);
          transform: translateY(-2px);
        }

        .label {
          font-size: 14px;
          color: #d8d8e5;
        }

        .hint {
          font-size: 12px;
          color: #8e8ea3;
        }

        input[type="text"],
        input[type="email"],
        input[type="password"] {
          background: rgba(12, 12, 18, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          padding: 12px 14px;
          color: #f1f1f4;
          font-size: 14px;
          outline: none;
          transition: border 0.2s ease, box-shadow 0.2s ease;
        }

        input[type="text"]:focus,
        input[type="email"]:focus,
        input[type="password"]:focus {
          border-color: rgba(61, 139, 255, 0.6);
          box-shadow: 0 0 0 3px rgba(61, 139, 255, 0.2);
        }

        .file {
          position: relative;
        }

        .file input[type="file"] {
          position: absolute;
          inset: 0;
          opacity: 0;
          cursor: pointer;
        }

        .file-ui {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 14px;
          background: rgba(12, 12, 18, 0.8);
          border: 1px dashed rgba(255, 255, 255, 0.2);
          border-radius: 12px;
          font-size: 13px;
          color: #d2d2e0;
        }

        .file-meta {
          color: #8f8fa6;
        }

        .footer {
          margin-top: 28px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 16px;
        }

        .summary {
          display: flex;
          gap: 12px;
        }

        .summary-label {
          display: block;
          font-size: 12px;
          color: #8f8fa6;
        }

        .summary-value {
          font-size: 14px;
          color: #e1e1ee;
        }

        .primary {
          background: linear-gradient(120deg, #3d8bff, #ff6d6d);
          border: none;
          color: #0b0b0f;
          padding: 12px 22px;
          font-weight: 600;
          border-radius: 12px;
          cursor: pointer;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .primary:hover {
          transform: translateY(-2px) scale(1.01);
          box-shadow: 0 10px 30px rgba(61, 139, 255, 0.35);
        }

        .ghost {
          border: 1px solid rgba(255, 255, 255, 0.2);
          background: rgba(255, 255, 255, 0.04);
          color: #d9d9ea;
          border-radius: 10px;
          padding: 8px 12px;
          cursor: pointer;
          transition: background 0.2s ease, border-color 0.2s ease;
          position: static;
        }

        .auth-toggle {
          margin-left: 0;
        }

        .upgrade-overlay {
          position: fixed;
          inset: 0;
          background: rgba(6, 8, 14, 0.72);
          backdrop-filter: blur(8px);
          display: grid;
          place-items: center;
          padding: 24px;
          z-index: 50;
          animation: fadeIn 0.2s ease forwards;
        }

        .upgrade-panel {
          width: min(1040px, 100%);
          border-radius: 24px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: linear-gradient(160deg, rgba(16, 18, 29, 0.96), rgba(20, 22, 34, 0.95));
          box-shadow: 0 30px 80px rgba(0, 0, 0, 0.5);
          padding: 32px;
          position: relative;
        }

        .upgrade-close {
          position: absolute;
          top: 14px;
          right: 14px;
          width: 32px;
          height: 32px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.18);
          background: rgba(255, 255, 255, 0.04);
          color: #d7d8e5;
          cursor: pointer;
        }

        .upgrade-head {
          max-width: 660px;
          margin-bottom: 24px;
        }

        .upgrade-kicker {
          display: inline-block;
          font-size: 12px;
          letter-spacing: 0.09em;
          text-transform: uppercase;
          color: #9eb9ff;
          margin-bottom: 8px;
        }

        .upgrade-head h3 {
          margin: 0 0 8px;
          font-size: clamp(24px, 3.4vw, 34px);
          color: #f0f3ff;
        }

        .upgrade-head p {
          margin: 0;
          color: #b7bdce;
          font-size: 15px;
          line-height: 1.45;
        }

        .plans {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 16px;
        }

        .plan-card {
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.02));
          border-radius: 18px;
          padding: 22px;
          position: relative;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .plan-card h4 {
          margin: 0;
          font-size: 18px;
          color: #f4f6ff;
        }

        .plan-price {
          margin: 0;
          font-size: 34px;
          line-height: 1;
          font-weight: 700;
          color: #eef2ff;
        }

        .plan-price span {
          font-size: 14px;
          font-weight: 500;
          color: #9fa7ba;
          margin-left: 4px;
        }

        .plan-features {
          margin: 0;
          padding-left: 18px;
          display: grid;
          gap: 6px;
          color: #d0d6e6;
          font-size: 14px;
          line-height: 1.35;
          min-height: 96px;
        }

        .plan-btn {
          margin-top: auto;
          border: 1px solid rgba(255, 255, 255, 0.22);
          background: rgba(255, 255, 255, 0.06);
          color: #e5e9f6;
          border-radius: 12px;
          padding: 10px 12px;
          font-weight: 600;
          cursor: pointer;
        }

        .featured {
          border-color: rgba(73, 144, 255, 0.55);
          box-shadow: 0 14px 32px rgba(73, 144, 255, 0.2);
          transform: translateY(-4px);
        }

        .plan-badge {
          position: absolute;
          top: 12px;
          right: 12px;
          font-size: 11px;
          font-weight: 600;
          color: #dcebff;
          border: 1px solid rgba(120, 178, 255, 0.52);
          border-radius: 999px;
          padding: 4px 8px;
          background: rgba(73, 144, 255, 0.2);
        }

        .plan-btn-primary {
          border: none;
          color: #0a0e19;
          background: linear-gradient(120deg, #63a8ff, #7ad0ff);
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes rise {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes float {
          0%,
          100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(16px);
          }
        }

        @media (max-width: 720px) {
          .page {
            padding: 32px 16px 56px;
          }

          .card {
            padding: 20px;
          }

          .section-head {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }

          .footer {
            flex-direction: column;
            align-items: flex-start;
          }

          .topbar {
            flex-wrap: wrap;
            justify-content: space-between;
          }

          .topbar-actions {
            width: 100%;
            justify-content: flex-end;
          }

          .upgrade-overlay {
            padding: 10px;
          }

          .upgrade-panel {
            padding: 20px 16px 16px;
            max-height: 92vh;
            overflow-y: auto;
          }

          .plans {
            grid-template-columns: 1fr;
          }

          .featured {
            transform: none;
          }
        }
      `}</style>
    </div>
  );
}
