import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Link as ScrollLink } from "react-scroll";
import { useParams } from "react-router";
import Markdown from "./outcome_components/Markdown";
import Spinner from "../components/Spinner";
import { userContext } from "../context/userContext";
import Slider from "./outcome_components/Slider";
import "./outcome_components/styling/outcome.css";
import ChatBox from "./outcome_components/ChatBox";
import BankStatementDashboard from "./outcome_components/BankDashboard";
import TaxReturnDashboard from "./outcome_components/TaxDashboard";
import DocumentDetailsDashboard from "./outcome_components/DocumentDetailsDashboard";

const STATUS_CONFIG = {
  idle: {
    label: "Waiting",
    badge: "secondary",
    description: "We are preparing this document for processing.",
  },
  uploading: {
    label: "Processing",
    badge: "info",
    description: "Hold tight while we finalize this document.",
  },
  completed: {
    label: "Processed",
    badge: "success",
    description: "Document processed successfully.",
  },
  error: {
    label: "Failed",
    badge: "danger",
    description: "Processing failed. Return to uploads to try again.",
  },
};

const Outcomes = (props) => {
  const { showAlert, showToast, host } = props.prop;
  const { caseid } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [page, setPage] = useState("page_1");
  const [chatBox, setChatBox] = useState(false);
  const [boxH, setBoxH] = useState(false);
  const [fraudImg, setFraudImg] = useState(false);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);

  const {
    documentGroups,
    uploadStatuses,
    uploadSummary,
    resetUploads,
    changeUploadCount,
    finalVerdict,
    getFinalVerdict,
  } = useContext(userContext);

  const caseId = location?.state?.caseId || uploadSummary?.caseId;
  useEffect(() => {
    if (caseid != caseId) {
      navigate("/");
      showAlert("Not Allowed", "danger");
    }
  }, []);

  const [activeKey, setActiveKey] = useState(
    () => documentGroups?.[0]?.key ?? null
  );
  const [expandedMap, setExpandedMap] = useState({});

  useEffect(() => {
    if (!documentGroups || documentGroups.length === 0) {
      return;
    }
    // Ensure the active key always points to a valid document group.
    const validKeys = documentGroups.map((item) => item.key);
    if (!validKeys.includes(activeKey)) {
      setActiveKey(validKeys[0]);
    }
  }, [documentGroups, activeKey]);

  const cards = useMemo(() => {
    if (!Array.isArray(documentGroups)) {
      return [];
    }
    return documentGroups.map((group) => {
      const state = uploadStatuses?.[group.key] || {};
      const statusKey = state.status || "idle";
      const status = STATUS_CONFIG[statusKey] || STATUS_CONFIG.idle;

      return {
        key: group.key,
        title: group.title,
        statusKey,
        status,
        response: state.response,
        error: state.error,
        icon: group.icon,
      };
    });
  }, [documentGroups, uploadStatuses]);

  const allDocumentsCompleted = useMemo(
    () =>
      cards.length > 0 && cards.every((card) => card.statusKey === "completed"),
    [cards]
  );
  const processedCount = useMemo(
    () => cards.filter((card) => card.statusKey === "completed").length,
    [cards]
  );

  const verdictData = finalVerdict?.data ?? null;
  const verdictUuid = finalVerdict?.uuid ?? verdictData?.uuid ?? null;
  const verdictContent = verdictData?.content;
  const verdictStatus = finalVerdict.status;
  const verdictError = finalVerdict.error;
  console.log("finalverdict", finalVerdict);

  const warningContent = useMemo(() => {
    if (!verdictError || typeof verdictError !== "object") {
      return { label: "", summary: "", details: "" };
    }

    const rawText =
      typeof verdictError.text === "string" ? verdictError.text : "";
    const rawMessage =
      typeof verdictError.message === "string" ? verdictError.message : "";

    const shouldSwap = rawMessage.length > 100;
    let label = "Detected Warning";
    if (verdictContent.toLowerCase() === "rejected") {
      label = "Verdict Reason";
    } else {
      if (verdictError.types === "warning") {
        label = "Detected Warning";
      } else {
        label = "Verdict Reason";
      }
    }

    return {
      label: label,
      summary: shouldSwap ? rawText : rawMessage,
      details: shouldSwap ? rawMessage : rawText,
    };
  }, [verdictError]);
  console.log(finalVerdict);

  const handleCopy = (content, copy, msg) => {
    showToast(content, copy, msg);
  };

  const activeCard =
    cards.find((card) => card.key === activeKey) || cards[0] || null;

  const identityFraudImage =
    activeKey === "identity_documents"
      ? activeCard?.response?.errors || null
      : null;
  const canToggleFraudImage = Boolean(identityFraudImage);
  const showFraudImage = canToggleFraudImage && fraudImg;

  useEffect(() => {
    if (!canToggleFraudImage) {
      setFraudImg(false);
    }
  }, [canToggleFraudImage, identityFraudImage, activeKey]);

  const isExpanded =
    activeCard && expandedMap.hasOwnProperty(activeCard.key)
      ? expandedMap[activeCard.key]
      : false;

  const toggleExpanded = () => {
    if (!activeCard) {
      return;
    }
    setExpandedMap((prev) => ({
      ...prev,
      [activeCard.key]: !isExpanded,
    }));
  };

  const handlePageChange = () => {
    setFraudImg(false);
    setPage((prev) => (prev === "page_1" ? "page_2" : "page_1"));
  };

  const renderKpiView = () => {
    const content = activeCard?.response?.data?.content;
    if (!content) {
      return (
        <Markdown content="No structured data available for this document." />
      );
    }

    const kpis = content.kpis;
    const summaryText = content.summary;

    if (activeKey === "bank_statements" && kpis && typeof kpis === "object") {
      return (
        <BankStatementDashboard transaction={kpis} summary={summaryText} />
      );
    }

    if (activeKey === "tax_statements") {
      return (
        <TaxReturnDashboard
          report={typeof kpis === "object" ? kpis : {}}
          summary={summaryText}
        />
      );
    }

    if (
      [
        "credit_reports",
        "identity_documents",
        "income_proof",
        "utility_bills",
      ].includes(activeKey)
    ) {
      return (
        <DocumentDetailsDashboard
          data={typeof kpis === "object" ? kpis : {}}
          summary={summaryText}
          documentKey={activeKey}
        />
      );
    }

    if (kpis && typeof kpis === "object") {
      return (
        <DocumentDetailsDashboard
          data={kpis}
          summary={summaryText}
          documentKey={activeKey}
        />
      );
    }

    if (typeof kpis === "string") {
      return <Markdown content={kpis} />;
    }

    if (summaryText) {
      return <Markdown content={summaryText} />;
    }

    return <Markdown content="No KPIs available for this document." />;
  };

  useEffect(() => {
    if (!caseId || !allDocumentsCompleted) {
      return;
    }

    if (finalVerdict.status === "loading") {
      return;
    }

    if (
      finalVerdict.status === "idle" ||
      (finalVerdict.status === "success" && verdictUuid !== caseId)
    ) {
      getFinalVerdict(caseId).catch(() => {});
    }
  }, [
    caseId,
    allDocumentsCompleted,
    finalVerdict.status,
    verdictUuid,
    getFinalVerdict,
  ]);

  const handleRetryFinalVerdict = useCallback(() => {
    if (!caseId || finalVerdict.status === "loading") {
      return;
    }
    getFinalVerdict(caseId).catch(() => {});
  }, [caseId, finalVerdict.status, getFinalVerdict]);

  function formatTitle(text) {
    if (!text) return "";

    const lower = text.toLowerCase();

    // Handle special cases
    if (lower === "yes") return "Yes";
    if (lower === "no") return "NO";

    return text
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }
  const warningLabel = warningContent.label;
  const warningSummary = warningContent.summary;
  const warningDetails = warningContent.details;

  const verdictDisplay = useMemo(() => {
    const base = {
      label: "Waiting for verdict",
      message:
        "We will share the final verdict once all documents finish processing.",
      variant: "warning",
      icon: "fa-solid fa-hourglass-half fa-beat",
      showRetry: false,
    };

    if (!allDocumentsCompleted) {
      return base;
    }

    if (verdictStatus === "loading") {
      return {
        label: "Fetching verdict...",
        message: "Please wait while we finalize the assessment.",
        variant: "info",
        icon: "fa-solid fa-circle-notch fa-spin",
        showRetry: false,
      };
    }

    if (verdictStatus === "error") {
      return {
        label: "Unable to fetch verdict",
        message:
          verdictError ||
          "We couldn't retrieve the final decision. Please try again.",
        variant: "danger",
        icon: "fa-solid fa-triangle-exclamation",
        showRetry: true,
      };
    }

    if (verdictStatus === "success") {
      let primaryText = "";
      let secondaryText = "";

      if (typeof verdictContent === "string") {
        primaryText = verdictContent.trim();
      } else if (verdictContent && typeof verdictContent === "object") {
        primaryText =
          verdictContent.verdict ||
          verdictContent.decision ||
          verdictContent.status ||
          verdictContent.label ||
          "";
        secondaryText =
          verdictContent.message ||
          verdictContent.summary ||
          verdictContent.reason ||
          "";
      }

      if (!primaryText) {
        primaryText =
          verdictData?.verdict ||
          verdictData?.decision ||
          verdictData?.status ||
          "Completed";
      }

      if (!secondaryText) {
        secondaryText =
          verdictData?.message ||
          verdictData?.summary ||
          verdictData?.reason ||
          "";
      }

      if (!secondaryText) {
        secondaryText =
          "Review the evaluation summary above for more insights.";
      }

      const normalized = primaryText.toLowerCase();
      let variant = "warning";
      let icon = "fa-solid fa-scale-balanced";

      if (/(yes|approve|eligible|pass|green)/.test(normalized)) {
        variant = "success";
        icon = "fa-solid fa-circle-check";
      } else if (/(no|reject|ineligible|fail|decline|red)/.test(normalized)) {
        variant = "danger";
        icon = "fa-solid fa-circle-xmark";
      } else if (/(pending|processing)/.test(normalized)) {
        variant = "info";
        icon = "fa-solid fa-hourglass-half";
      } else if (/(review|manual)/.test(normalized)) {
        variant = "primary";
        icon = "fa-solid fa-user-pen";
      }

      return {
        label: formatTitle(primaryText),
        message: secondaryText,
        variant,
        icon,
        showRetry: false,
      };
    }

    return base;
  }, [
    allDocumentsCompleted,
    verdictStatus,
    verdictError,
    verdictContent,
    verdictData,
  ]);

  const verdictVariant = verdictDisplay.variant;
  const verdictIcon = verdictDisplay.icon;
  const verdictLabel = verdictDisplay.label;
  const verdictMessage = verdictDisplay.message;
  const showVerdictRetry = verdictDisplay.showRetry;

  const verdictPanelStyle =
    verdictVariant === "success"
      ? { backgroundColor: "rgba(25, 135, 84, 0.07)" }
      : verdictVariant === "danger"
      ? { backgroundColor: "rgba(220, 53, 69, 0.07)" }
      : verdictVariant === "info"
      ? { backgroundColor: "rgba(13, 202, 240, 0.12)" }
      : verdictVariant === "warning"
      ? { backgroundColor: "rgba(255, 193, 7, 0.12)" }
      : verdictVariant === "primary"
      ? { backgroundColor: "rgba(13, 110, 253, 0.07)" }
      : { backgroundColor: "rgba(108, 117, 125, 0.08)" };

  const handleTryOtherDocument = () => {
    changeUploadCount(6);
    navigate("/");
  };

  const handleRestart = () => {
    resetUploads();
    changeUploadCount(0);
    navigate("/");
  };

  return (
    <div className="container py-5">
      <div className="d-flex flex-column flex-lg-row align-items-lg-end justify-content-between gap-3 mb-4">
        <div>
          <h1 className="h3 fw-bold mb-1">Hi, Thanks for visting</h1>
          <p className="text-muted mb-0">
            Our Smart system has analysed the documents and below are detailed
            report against each document.
          </p>
        </div>
        <div className="text-lg-end">
          {caseId && (
            <>
              <span className="d-block text-muted small">
                For any further clarification, please reach out with Reference
                Id
              </span>
              <span className="text-break" style={{ fontSize: "13px" }}>
                {caseId}
                <span
                  style={{ cursor: "pointer" }}
                  onClick={() => handleCopy(caseId, true, "Reference Id")}
                >
                  <i className="fa-regular fa-copy fa-sm ms-1"></i>
                </span>
              </span>
            </>
          )}
        </div>
      </div>

      <div className="mb-4 d-flex flex-column flex-md-row gap-3 justify-content-between align-items-md-center">
        <div className="d-flex flex-wrap gap-2">
          {cards.map((card) => (
            <button
              key={card.key}
              type="button"
              className={`btn btn-sm ${
                card.key === activeKey ? "btn-primary" : "btn-outline-secondary"
              }`}
              onClick={() => {
                setActiveKey(card.key);
                setStatusDropdownOpen(false);
              }}
            >
              {card.icon && <i className={`${card.icon} me-2 `}></i>}
              {card.title}
            </button>
          ))}
        </div>
        {cards.length > 0 && (
          <div className="position-relative">
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-2"
              onClick={() => setStatusDropdownOpen((prev) => !prev)}
            >
              <span>
                Processed {processedCount}/{cards.length}
              </span>
              <i
                className={`fa-solid fa-chevron-${
                  statusDropdownOpen ? "up" : "down"
                }`}
              ></i>
            </button>
            {statusDropdownOpen && (
              <>
                <div
                  className="card shadow-sm mt-2 position-absolute end-0"
                  style={{ minWidth: "260px", zIndex: 5 }}
                >
                  <div className="card-body p-0">
                    <ul className="list-group list-group-flush">
                      {cards.map((card) => (
                        <li
                          key={`${card.key}-status`}
                          className="list-group-item d-flex justify-content-between align-items-center small"
                        >
                          <span className="fw-semibold me-2">{card.title}</span>
                          <span
                            className={`badge rounded-pill badge-sm bg-${card.status.badge}`}
                            style={{ fontSize: "12px" }}
                          >
                            {card.status.label}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <div className="border rounded-3 p-4 shadow-sm" id="result">
        {activeCard ? (
          <>
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2 mb-3">
              <div>
                <h2 className="h5 mb-1">{activeCard.title}</h2>
                <p className="text-muted small mb-0">
                  {activeCard.status.description}
                </p>
              </div>
              <div>
                {showFraudImage && (
                  <button
                    className="btn btn-outline-dark btn-sm me-2 px-3"
                    onClick={() => setFraudImg(false)}
                  >
                    <i className="fa-solid fa-arrow-left fa-sm"></i>
                  </button>
                )}
                <span
                  className={`badge bg-${
                    canToggleFraudImage ? "danger" : activeCard.status.badge
                  } px-3`}
                  style={
                    canToggleFraudImage ? { cursor: "pointer" } : undefined
                  }
                  onClick={() => {
                    if (!canToggleFraudImage) return;
                    setPage("page_1");
                    setFraudImg(true);
                  }}
                >
                  {canToggleFraudImage
                    ? "Fraud Detected"
                    : activeCard.status.label}
                </span>
                {canToggleFraudImage && (
                  <p
                    className="text-muted text-end me-1"
                    style={{ fontSize: "12px" }}
                  >
                    Click to view
                  </p>
                )}
              </div>
            </div>

            {activeCard.statusKey !== "completed" &&
              activeCard.statusKey !== "error" && (
                <div className="d-flex justify-content-center py-4">
                  <Spinner color="primary" size="md" />
                </div>
              )}

            {activeCard.statusKey === "completed" &&
              activeCard.response?.data?.content && (
                <div className="bg-light border rounded-3 p-3 mb-3">
                  {/* <p className="small fw-semibold mb-2 text-success">Result</p> */}
                  <div className="mb-4">
                    <center>
                      <ScrollLink
                        className="btn btn-outline-dark mt-3 px-5 shadow"
                        onClick={handlePageChange}
                        to="result"
                      >
                        {page == "page_1" ? "KPIs" : "Extracted Annotations"}
                      </ScrollLink>
                    </center>
                  </div>
                  {showFraudImage && (
                    <center>
                      <div
                        class="alert alert-danger border border-2 rounded-3 shadow-sm py-3 px-4 mb-3"
                        style={{ width: "50%" }}
                      >
                        <h5 class="text-uppercase fw-semibold mb-2">
                          <i class="fa-solid fa-circle-exclamation fa-sm me-2"></i>
                          Information
                        </h5>
                        <p class="mb-0">
                          The uploaded file failed validation due to
                          discrepancies in <strong>authenticity</strong>{" "}
                          markers. Please provide a clear and verified copy of
                          your ID.
                        </p>
                      </div>
                    </center>
                  )}
                  <div
                    className="position-relative"
                    style={
                      !isExpanded && page === "page_2"
                        ? {
                            maxHeight: "500px",
                            overflow: "hidden",
                            overflowY: "scroll",
                          }
                        : undefined
                    }
                  >
                    <div className="">
                      {page == "page_1" ? (
                        (() => {
                          const baseImages =
                            activeCard.response.data.content["images"];
                          const images =
                            (showFraudImage && identityFraudImage
                              ? [identityFraudImage]
                              : baseImages) || [];
                          if (images && images.length === 1) {
                            return (
                              <center>
                                <img
                                  src={`data:image/png;base64,${images[0]}`}
                                  alt="Extracted Annotation Not Found"
                                  className="shadow rounded mb-2 animate__animated animate__zoomIn"
                                  style={{
                                    maxWidth:
                                      activeKey === "identity_documents"
                                        ? "50%"
                                        : "70%",
                                    height:
                                      activeKey === "identity_documents"
                                        ? "50%"
                                        : "710px",
                                  }}
                                />
                              </center>
                            );
                          }
                          return <Slider images={images} />;
                        })()
                      ) : (
                        <div className="animate__animated animate__zoomIn">
                          {renderKpiView()}
                        </div>
                      )}
                    </div>
                    {page === "page_2" && (
                      <div className="scrollbox-fade" aria-hidden="true"></div>
                    )}
                  </div>
                </div>
              )}

            {activeCard.statusKey === "completed" &&
              activeCard.response &&
              !activeCard.response?.data && (
                <div className="bg-light border rounded-3 p-3 mb-3">
                  <p className="small fw-semibold mb-2 text-success">
                    Result payload
                  </p>
                  <pre className="small mb-0 text-break">
                    {JSON.stringify(activeCard.response, null, 2)}
                  </pre>
                </div>
              )}

            {activeCard.statusKey === "completed" && !activeCard.response && (
              <p className="small text-success mb-3">
                Processing completed successfully. No response payload was
                returned.
              </p>
            )}

            {activeCard.statusKey === "error" && (
              <div className="bg-light border border-danger rounded-3 p-3 mb-3">
                <p className="small text-danger mb-0">
                  {activeCard.error ||
                    "Processing failed. Please try re-uploading this document."}
                </p>
              </div>
            )}
          </>
        ) : (
          <p className="text-muted mb-0">
            No documents available. Return to uploads to begin a new case.
          </p>
        )}
      </div>

      {/* Final Verdict section */}
      {cards.length > 0 && (
        <section className="mt-4">
          <div className="row g-3 align-items-stretch">
            <div className={`col-12 col-lg-${verdictError ? "6" : "12"}`}>
              <div
                className={`${
                  boxH && "h-100"
                } rounded-4 border border-${verdictVariant} shadow-sm p-4`}
                style={verdictPanelStyle}
              >
                <div className="d-flex flex-column flex-md-row align-items-start align-items-md-center gap-3">
                  <div
                    className={`rounded-circle bg-${verdictVariant} text-white d-flex align-items-center justify-content-center flex-shrink-0`}
                    style={{ width: "56px", height: "56px" }}
                  >
                    <i className={`${verdictIcon} fa-lg`}></i>
                  </div>
                  <div>
                    <h3 className="h5 fw-bold mb-1">The Final Verdict</h3>
                    <p
                      className={`fs-4 fw-semibold text-${verdictVariant} mb-1`}
                    >
                      {verdictLabel}
                    </p>
                    <p className="mb-0 text-muted">{verdictMessage}</p>
                    {allDocumentsCompleted && (
                      <p className="text-muted">
                        Use the chat box for any additional queries.
                      </p>
                    )}
                    {showVerdictRetry && (
                      <button
                        type="button"
                        className={`btn btn-outline-${verdictVariant} btn-sm mt-3`}
                        onClick={handleRetryFinalVerdict}
                        disabled={verdictStatus === "loading"}
                      >
                        Try again
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
            {warningLabel && (
              <div className="col-12 col-lg-6">
                <div
                  className={`${
                    boxH && "h-100"
                  } rounded-4 border border-warning shadow-sm p-4`}
                >
                  {/* <div className="d-flex flex-column flex-md-row align-items-start align-items-md-center gap-3"> */}
                  {/* <div
                    className={`rounded-circle bg-warning text-white d-flex align-items-center justify-content-center flex-shrink-0`}
                    style={{ width: "56px", height: "56px" }}
                  >
                    <i class="fa-solid fa-triangle-exclamation"></i>
                  </div> */}
                  <div>
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <div>
                        <p className="text-uppercase text-muted small mb-1">
                          Risk Insights
                        </p>
                        <h3 className="h5 fw-bold mb-0">
                          {warningLabel || "Detected Warning"}
                        </h3>
                      </div>
                    </div>
                    <p className="fw-semibold mb-3 text-secondary">
                      {warningSummary || "No summary available."}
                    </p>
                    <div className="accordion" id="warningAccordion">
                      <div className="accordion-item border-0">
                        <h2 className="accordion-header" id="warningHeading">
                          <button
                            className="accordion-button collapsed shadow-sm border border-warning rounded"
                            type="button"
                            data-bs-toggle="collapse"
                            data-bs-target="#warningCollapse"
                            aria-expanded="true"
                            aria-controls="warningCollapse"
                          >
                            View warning details
                          </button>
                        </h2>
                        <div
                          id="warningCollapse"
                          className="accordion-collapse collapse"
                          aria-labelledby="warningHeading"
                          data-bs-parent="#warningAccordion"
                        >
                          <div className="accordion-body text-muted">
                            <Markdown
                              content={
                                warningDetails || "No additional details."
                              }
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* </div> */}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      <div className="d-flex flex-column flex-md-row justify-content-between gap-3 mt-5">
        <div>
          <button
            type="button"
            className="btn btn-outline-secondary px-4 me-2"
            onClick={handleTryOtherDocument}
          >
            <i class="fa-solid fa-rotate me-2"></i>Try with other document
          </button>
          <button
            type="button"
            className="btn btn-outline-danger px-4 ms-2"
            onClick={handleRestart}
          >
            <i class="fa-solid fa-power-off me-2"></i>Restart
          </button>
        </div>
        <div>
          {chatBox && (
            <ChatBox case_id={caseId} showAlert={showAlert} host={host} />
          )}
          {allDocumentsCompleted && verdictStatus === "success" && (
            <button
              className={`btn btn-${
                chatBox ? "outline-primary" : "primary"
              } px-4`}
              onClick={() => setChatBox(!chatBox)}
            >
              <i
                className={`fa-solid fa-${chatBox ? "xmark" : "comments"} me-2`}
              ></i>
              {chatBox ? "Close" : "Chat"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Outcomes;
