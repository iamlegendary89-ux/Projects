import React from 'react';
import { ScoreVector } from '../../types';

interface AttributeRatingsProps {
  scores: ScoreVector;
}

const attributeLabels: { [key in keyof ScoreVector]: string } = {
  price: "Price",
  performance: "Performance",
  camera: "Camera",
  battery: "Battery",
  design: "Design",
  software: "Software",
};

const AttributeRatings: React.FC<AttributeRatingsProps> = ({ scores }) => (
  <div className="my-6">
    <h4 className="font-semibold text-lg mb-3 text-slate-200">Key Attributes</h4>
    <div className="space-y-2.5">
      {Object.entries(scores).map(([key, value]) => (
        <div key={key} className="grid grid-cols-3 items-center gap-2">
          <span className="text-sm text-slate-400 col-span-1">{attributeLabels[key as keyof ScoreVector] || key}</span>
          <div className="col-span-2 w-full bg-slate-700 rounded-full h-2">
            <div className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2 rounded-full" style={{ width: `${value}%` }}></div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default AttributeRatings;
