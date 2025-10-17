// components/PhoneCardDetails/SpecSheet.tsx
import React from 'react';
import { PhoneSpecs } from '../../types';

interface SpecSheetProps {
  specs: PhoneSpecs;
}

const SpecSheet: React.FC<SpecSheetProps> = ({ specs }) => {
  const specItems = [
    { label: 'Processor', value: specs.processor },
    { label: 'RAM', value: specs.ram },
    { label: 'Storage', value: specs.storage },
    { label: 'Display', value: specs.display },
    { label: 'Battery', value: specs.battery },
    { label: 'Charging', value: specs.charging },
    { label: 'Main Camera', value: specs.mainCamera },
    { label: 'Front Camera', value: specs.frontCamera },
    { label: 'Operating System', value: specs.os },
    { label: 'Dimensions', value: specs.dimensions },
    { label: 'Weight', value: specs.weight },
  ];

  return (
    <div className="mt-6">
      <h3 className="text-xl font-semibold text-cyan-400 mb-3">Full Specifications</h3>
      <div className="bg-slate-700/30 p-4 rounded-lg">
        <ul className="space-y-2">
          {specItems.map((item, index) => (
            <li key={index} className="grid grid-cols-3 gap-2 text-sm">
              <strong className="col-span-1 text-slate-400 font-medium">{item.label}</strong>
              <span className="col-span-2 text-slate-200">{item.value}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default SpecSheet;
