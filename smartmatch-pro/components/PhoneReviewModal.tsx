import React, { useEffect, useState } from 'react';
import { Phone, ReviewAspect, LocalOffer } from '../types';
import { XIcon, StarIcon } from './icons';
import RegionalPriceDisplay from './PhoneCardDetails/RegionalPriceDisplay';
import LocalOffersDisplay from './PhoneCardDetails/LocalOffersDisplay';

interface PhoneReviewModalProps {
  phone: Phone;
  onClose: () => void;
  countryCode?: string | null;
}

const ReviewAspectSection: React.FC<{ title: string; aspect: ReviewAspect | undefined | null }> = ({ title, aspect }) => {
  if (!aspect) return null;

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-cyan-400">{title}</h3>
          <div className="flex items-center gap-2 bg-slate-700/50 px-3 py-1 rounded-full">
            <StarIcon className="w-5 h-5 text-amber-400" />
            <span className="font-bold text-lg text-white">{aspect.score.toFixed(1)}<span className="text-sm text-slate-400">/10</span></span>
          </div>
      </div>
      <div className="prose prose-invert prose-p:text-slate-300 max-w-none mt-2">
        <p><strong className="text-slate-100">Justification:</strong> {aspect.justification}</p>
        <p>{aspect.details}</p>
      </div>
    </div>
  );
};


const PhoneReviewModal: React.FC<PhoneReviewModalProps> = ({ phone, onClose, countryCode }) => {
  // Handle Escape key press to close the modal
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const hasDetailedReview = phone.performanceReview || phone.cameraReview || phone.batteryReview || phone.displayReview || phone.userExperienceReview;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50 animate-fade-in"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div
        className="bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-slate-700 animate-slide-up"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
      >
        <div className="sticky top-0 bg-slate-800/80 backdrop-blur-sm p-6 sm:p-8 z-10">
            <div className="flex justify-between items-start">
            <div>
                <h2 className="text-3xl font-bold text-cyan-300">{phone.name}</h2>
                <p className="text-slate-400">{phone.brand}</p>
            </div>
            <button
                onClick={onClose}
                className="text-slate-400 hover:text-white transition-colors"
                aria-label="Close review"
            >
                <XIcon className="w-8 h-8" />
            </button>
            </div>            
        </div>

        <div className="p-6 sm:p-8 pt-0">
            <div className="prose prose-invert prose-p:text-slate-300 prose-headings:text-cyan-400 max-w-none">
            <h3 className="text-xl font-semibold">Expert Summary</h3>
            <p>{phone.summary}</p>
            </div>

            {phone.lastUpdated && (
                <div className="mt-4 text-xs text-slate-400 text-center">
                    <p>AI Review Last Updated: {new Date(phone.lastUpdated).toLocaleDateString()}</p>
                </div>
            )}

            {phone.reviewConfidenceScore && phone.reviewConfidenceScore < 8 && (
              <div className="mt-4 text-center text-sm text-slate-400 bg-slate-700/30 p-3 rounded-lg">
                <p>
                  <strong>Review Confidence:</strong> This review is based on limited data. Check back later for a more comprehensive analysis.
                </p>
              </div>
            )}

            {phone.regionalPrices && (
              <div className="mt-6">
                <div className="flex items-center justify-between">
                    <h3 className="text-xl font-semibold text-cyan-400">Price</h3>
                    <RegionalPriceDisplay regionalPrices={phone.regionalPrices} countryCode={countryCode} />
                </div>
              </div>
            )}
            
            <LocalOffersDisplay phoneId={phone.id} countryCode={countryCode} />

            {phone.newerModelComparison && phone.newerModelComparison.isNewerModelAvailable && (
              <div className="mt-6 bg-slate-700/30 p-4 rounded-lg">
                <h3 className="text-xl font-semibold text-cyan-400">Successor Available</h3>
                <div className="prose prose-invert prose-p:text-slate-300 max-w-none mt-2">
                  <p>
                    <strong>Newer Model:</strong> {phone.newerModelComparison.newerModelName}
                    <br />
                    <strong>Comparison:</strong> {phone.newerModelComparison.comparisonSummary}
                  </p>
                </div>
              </div>
            )}

            {phone.softwareUpdateInfo && (
              <div className="mt-6">
                <h3 className="text-xl font-semibold text-cyan-400">Software Status</h3>
                <div className="prose prose-invert prose-p:text-slate-300 max-w-none mt-2">
                  <p>
                    <strong>Latest OS:</strong> {phone.softwareUpdateInfo.latestOS}
                    <br />
                    <strong>Status:</strong> {phone.softwareUpdateInfo.updateStatus}
                  </p>
                </div>
              </div>
            )}

            {hasDetailedReview ? (
                <>
                    <ReviewAspectSection title="Performance" aspect={phone.performanceReview} />
                    <ReviewAspectSection title="Camera" aspect={phone.cameraReview} />
                    <ReviewAspectSection title="Battery" aspect={phone.batteryReview} />
                    <ReviewAspectSection title="Display" aspect={phone.displayReview} />
                    <ReviewAspectSection title="User Experience" aspect={phone.userExperienceReview} />
                </>
            ) : (
                 <div className="mt-6 text-center text-slate-400 bg-slate-700/30 p-4 rounded-lg">
                    <p>A detailed AI review is not yet available for this model.</p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default PhoneReviewModal;