"use client";

import React from 'react';

interface BookingStepperProps {
  currentStep: 1 | 2 | 3 | 4;
}

export default function BookingStepper({ currentStep }: BookingStepperProps) {
  const steps = [
    { number: 1, title: 'Thông tin bàn', desc: 'Ngày, giờ & số khách' },
    { number: 2, title: 'Vị trí bàn', desc: 'Chọn bàn trên sơ đồ' },
    { number: 3, title: 'Chọn món ăn', desc: 'Đặt món trước (Tùy chọn)' },
    { number: 4, title: 'Xác nhận', desc: 'Hoàn tất đặt bàn & hóa đơn' },
  ];

  return (
    <div className="w-full bg-white/90 backdrop-blur-sm border-b border-[#ebe7df] shadow-[0_2px_8px_rgba(28,25,23,0.03)] py-6 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between relative">
          {/* Đường line kết nối tiến trình */}
          <div className="absolute top-6 left-12 right-12 h-1 bg-[#ebe7df] -z-0 hidden md:block rounded-full">
            <div
              className="h-full bg-[#14532d] transition-all duration-500 rounded-full"
              style={{
                width:
                  currentStep === 1
                    ? '0%'
                    : currentStep === 2
                    ? '33.3%'
                    : currentStep === 3
                    ? '66.6%'
                    : '100%',
              }}
            />
          </div>

          {steps.map((step) => {
            const isCompleted = step.number < currentStep;
            const isCurrent = step.number === currentStep;

            return (
              <div key={step.number} className="flex-1 flex flex-col items-center text-center relative z-10 px-1">
                {/* Vòng tròn số bước */}
                <div
                  className={`w-12 h-12 sm:w-13 sm:h-13 rounded-full flex items-center justify-center font-bold text-base sm:text-lg transition-all duration-300 ${
                    isCompleted
                      ? 'bg-[#14532d] text-white ring-4 ring-[#dcfce7] shadow-xs'
                      : isCurrent
                      ? 'bg-[#14532d] text-white ring-4 ring-[#fef3c7] scale-105 shadow-[0_4px_16px_rgba(20,83,45,0.25)]'
                      : 'bg-[#faf8f5] text-[#a8a29e] border border-[#d6d0c4]'
                  }`}
                >
                  {isCompleted ? (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <span className="font-serif">{step.number}</span>
                  )}
                </div>

                {/* Tiêu đề & mô tả */}
                <div className="mt-3 space-y-0.5">
                  <p
                    className={`font-serif text-sm sm:text-base font-bold whitespace-nowrap ${
                      isCurrent
                        ? 'text-[#14532d]'
                        : isCompleted
                        ? 'text-[#1c1917]'
                        : 'text-[#a8a29e]'
                    }`}
                  >
                    {step.title}
                  </p>
                  <p className="text-[11px] sm:text-xs text-[#78716c] font-medium hidden sm:block">
                    {step.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
