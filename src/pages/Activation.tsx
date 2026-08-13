import Home from "./Home";
import { useEffect, useRef, useState } from "react";
import "./Activation.css";

type ActivationStatus = "idle" | "loading" | "success" | "error";

function Activation() {
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<ActivationStatus>("idle");
  const [message, setMessage] = useState("");

  const inputRef = useRef<HTMLInputElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Important for Smart TV:
    // Put the initial focus directly on the activation input.
    inputRef.current?.focus();
  }, []);

  const formatCode = (value: string) => {
    const clean = value
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 12);

    const parts = clean.match(/.{1,4}/g);

    return parts ? parts.join("-") : "";
  };

  const handleCodeChange = (value: string) => {
    setCode(formatCode(value));

    if (status !== "idle") {
      setStatus("idle");
      setMessage("");
    }
  };

  const handleActivate = async () => {
    const cleanCode = code.replace(/-/g, "");

    if (cleanCode.length !== 12) {
      setStatus("error");
      setMessage("Please enter a valid 12-character activation code.");
      inputRef.current?.focus();
      return;
    }

    setStatus("loading");
    setMessage("");

    /*
     * Temporary activation simulation.
     *
     * Later we will replace this section with:
     *
     * const response = await activateDevice(cleanCode);
     *
     * and connect it to the BonoPlayer API.
     */
    await new Promise((resolve) => setTimeout(resolve, 1200));

   setStatus("success");
setMessage("Device activated successfully.");

localStorage.setItem("bonoplayer_activation_code", cleanCode);

setTimeout(() => {
  window.location.reload();
}, 1000);
  };

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleActivate();
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      buttonRef.current?.focus();
    }
  };

  const handleButtonKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>
  ) => {
    if (event.key === "ArrowUp") {
      event.preventDefault();
      inputRef.current?.focus();
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleActivate();
    }
  };

  const isLoading = status === "loading";
  const isSuccess = status === "success";
  const isError = status === "error";

  return (
    <main className="activation-page">
      <div className="activation-background">
        <div className="activation-glow activation-glow-one" />
        <div className="activation-glow activation-glow-two" />
      </div>

      <section className="activation-card">
        <div className="activation-brand">
          <div className="activation-logo-mark">
            B
          </div>

          <div className="activation-logo-text">
            BONO<span>PLAYER</span>
          </div>
        </div>

        <div className="activation-content">
          <div className="activation-icon">
            <span>✓</span>
          </div>

          <h1>Activate your device</h1>

          <p className="activation-description">
            Enter the activation code displayed in your
            BonoPlayer account to start watching.
          </p>

          <div className="activation-form">
            <label htmlFor="activation-code">
              Activation Code
            </label>

            <input
              ref={inputRef}
              id="activation-code"
              type="text"
              inputMode="text"
              autoComplete="off"
              spellCheck={false}
              value={code}
              onChange={(event) =>
                handleCodeChange(event.target.value)
              }
              onKeyDown={handleKeyDown}
              placeholder="XXXX-XXXX-XXXX"
              maxLength={14}
              disabled={isLoading || isSuccess}
              aria-label="Activation code"
              className={`activation-input ${
                isError ? "input-error" : ""
              } ${
                isSuccess ? "input-success" : ""
              }`}
            />

            <div className="activation-input-hint">
              12 characters
            </div>
          </div>

          <button
            ref={buttonRef}
            type="button"
            className={`activation-button ${
              isLoading ? "button-loading" : ""
            } ${
              isSuccess ? "button-success" : ""
            }`}
            onClick={handleActivate}
            onKeyDown={handleButtonKeyDown}
            disabled={isLoading || isSuccess}
          >
            {isLoading && (
              <span className="activation-spinner" />
            )}

            {!isLoading && !isSuccess && (
              <span>Activate Device</span>
            )}

            {isLoading && (
              <span>Activating...</span>
            )}

            {isSuccess && (
              <span>Activated ✓</span>
            )}
          </button>

          {message && (
            <div
              className={`activation-message ${
                isError
                  ? "message-error"
                  : "message-success"
              }`}
              role="status"
            >
              <span className="message-icon">
                {isError ? "!" : "✓"}
              </span>

              <span>{message}</span>
            </div>
          )}

          <div className="activation-help">
            <div className="help-row">
              <span className="help-key">↑ ↓</span>
              <span>Navigate</span>
            </div>

            <div className="help-row">
              <span className="help-key">ENTER</span>
              <span>Select</span>
            </div>
          </div>
        </div>

        <footer className="activation-footer">
          <span>BonoPlayer</span>
          <span className="footer-separator">•</span>
          <span>Smart TV</span>
        </footer>
      </section>
    </main>
  );
}

export default Activation;