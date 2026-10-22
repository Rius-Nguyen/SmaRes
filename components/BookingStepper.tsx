"use client";

import React from 'react';
import Link from 'next/link';

interface BookingStepperProps {
  currentStep: 1 | 2 | 3 | 4;
}

export default function BookingStepper({ currentStep }: BookingStepperProps) {
  const steps = [
    { number: 1, title: 'Thông tin bàn', desc: 'Ngày, giờ & số khách', path: '/booking' },
    { number: 2, title: 'Vị trí bàn', desc: 'Chọn bàn trên sơ đồ', path: '/booking/diagram' },
    { number: 3, title: 'Chọn món ăn', desc: 'Giỏ hàng đặt trước (Tùy chọn)', path: '/booking/menu' },
    { number: 4, title: 'Xác nhận', desc: 'Hoàn tất đặt bàn & thực đơn', path: '/booking/confirm' },
  ];

  return (
    <div className="w-full bg-white border-b border-gray-100 shadow-sm py-4 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between relative">
          {/* Đường line kết nối các bước */}
          <div className="absolute top-5 left-8 right-8 h-0.5 bg-gray-200 -z-0 hidden md:block">
            <div
              className="h-full bg-green-700 transition-all duration-500"
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
            ></div>
          </div>

          {steps.map((step) => {
            const isCompleted = step.number < currentStep;
            const isCurrent = step.number === currentStep;

            return (
              <div key={step.number} className="flex-1 flex flex-col items-center text-center relative z-10 px-1">
                {/* Vòng tròn số bước */}
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 shadow-sm ${
                    isCompleted
                      ? 'bg-green-700 text-white ring-4 ring-green-100'
                      : isCurrent
                      ? 'bg-green-800 text-white ring-4 ring-green-200 scale-105 shadow-md'
                      : 'bg-gray-100 text-gray-400 border border-gray-300'
                  }`}
                >
                  {isCompleted ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    step.number
                  )}
                </div>

                {/* Tiêu đề & mô tả */}
                <div className="mt-2">
                  <p
                    className={`text-xs sm:text-sm font-bold whitespace-nowrap ${
                      isCurrent
                        ? 'text-green-800'
                        : isCompleted
                        ? 'text-gray-800'
                        : 'text-gray-400'
                    }`}
                  >
                    {step.title}
                  </p>
                  <p className="text-[11px] text-gray-500 hidden sm:block">
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
