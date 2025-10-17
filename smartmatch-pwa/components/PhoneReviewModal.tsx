import React from 'react';
import { Phone, ReviewAspect } from '../types';
import { XIcon, StarIcon } from './icons';
import RegionalPriceDisplay from './PhoneCardDetails/RegionalPriceDisplay';
import LocalOffersDisplay from './PhoneCardDetails/LocalOffersDisplay';
import ProsAndConsList from './PhoneCardDetails/ProsAndConsList';
import SpecSheet from './PhoneCardDetails/SpecSheet';

interface PhoneReviewModalProps {
  phone: Phone;
  onClose: () => void;
  countryCode?: string | null;
}

const ReviewAspectSection: React.FC<{ title: string; aspect: ReviewAspect | undefined; }> = ({ title, aspect }) => {
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
        <p>{aspect.justification}</p>
        {aspect.details && <p className="mt-2 text-sm text-slate-400">{aspect.details}</p>}
      </div>
    </div>
  );
};

const InfoSection: React.FC<{ title: string; children: React.ReactNode; }> = ({ title, children }) => (
    <div className="mt-6">
        <h3 className="text-xl font-semibold text-cyan-400 mb-2">{title}</h3>
        <div className="prose prose-invert prose-p:text-slate-300 max-w-none">
            {children}
        </div>
    </div>
);

const PhoneReviewModal: React.FC<PhoneReviewModalProps> = ({ phone, onClose, countryCode }) => {
  const hasDetailedReview = phone.performanceReview || phone.cameraReview || phone.batteryReview || phone.displayReview || phone.userExperienceReview;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div
        className="bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-slate-700"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-slate-800/80 backdrop-blur-sm p-6 sm:p-8 z-10">
            <div className="flex justify-between items-start">
            <div>
                <h2 className="text-3xl font-bold text-cyan-300">{phone.name}</h2>
                <p className="text-slate-400">{phone.brand}</p>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors" aria-label="Close review">
                <XIcon className="w-8 h-8" />
            </button>
            </div>
        </div>

        <div className="p-6 sm:p-8 pt-0">
            {phone.summary && (
              <InfoSection title="Expert Summary">
                <p>{phone.summary}</p>
              </InfoSection>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-center mt-4 text-xs text-slate-400">
                {phone.lastUpdated && <p>Review Updated: {new Date(phone.lastUpdated).toLocaleDateString()}</p>}
                {phone.priceLastChecked && <p>Price Updated: {new Date(phone.priceLastChecked).toLocaleDateString()}</p>}
            </div>

            {phone.reviewConfidenceScore && (
              <div className="mt-4 text-center text-sm text-slate-400 bg-slate-700/30 p-3 rounded-lg">
                <p><strong>AI Review Confidence Score:</strong> {phone.reviewConfidenceScore}/10</p>
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

            <LocalOffersDisplay phoneId={phone.id} phoneName={phone.name} brand={phone.brand} countryCode={countryCode} />

            {phone.pros && phone.cons && (
              <div className="mt-6">
                <ProsAndConsList pros={phone.pros} cons={phone.cons} />
              </div>
            )}

            {phone.specs && <SpecSheet specs={phone.specs} />}

            {hasDetailedReview && (
                <div className="mt-6">
                    <h2 className="text-2xl font-bold text-slate-100 mb-4 border-b border-slate-700 pb-2">Detailed Analysis</h2>
                    <ReviewAspectSection title="Performance" aspect={phone.performanceReview} />
                    <ReviewAspectSection title="Camera" aspect={phone.cameraReview} />
                    <ReviewAspectSection title="Battery" aspect={phone.batteryReview} />
                    <ReviewAspectSection title="Display" aspect={phone.displayReview} />
                    <ReviewAspectSection title="User Experience" aspect={phone.userExperienceReview} />
                </div>
            )}
            
            {phone.newerModelComparison && (
              <InfoSection title="Newer Model Comparison">
                <p><strong>Available:</strong> {phone.newerModelComparison.isNewerModelAvailable ? 'Yes' : 'No'}</p>
                {phone.newerModelComparison.newerModelName && <p><strong>Model:</strong> {phone.newerModelComparison.newerModelName}</p>}
                {phone.newerModelComparison.comparisonSummary && <p><strong>Summary:</strong> {phone.newerModelComparison.comparisonSummary}</p>}
              </InfoSection>
            )}

            {phone.softwareUpdateInfo && (
              <InfoSection title="Software Status">
                <p><strong>Latest OS:</strong> {phone.softwareUpdateInfo.latestOS}</p>
                <p><strong>Update Status:</strong> {phone.softwareUpdateInfo.updateStatus}</p>
              </InfoSection>
            )}
        </div>
      </div>
    </div>
  );
};

export default PhoneReviewModal;
