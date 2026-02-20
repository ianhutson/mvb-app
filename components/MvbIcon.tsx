import React from 'react';
import Svg, { Rect, Circle, Path, Polygon, Text, Defs, LinearGradient, Stop, Filter, FeGaussianBlur, FeMerge, FeMergeNode } from 'react-native-svg';

interface Props {
  size?: number;
}

export default function MvbIcon({ size = 120 }: Props) {
  const s = size / 1024;
  const scale = `scale(${s})`;

  return (
    <Svg width={size} height={size} viewBox="0 0 1024 1024">
      <Defs>
        <LinearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#FFD700" stopOpacity={1} />
          <Stop offset="50%" stopColor="#F5C518" stopOpacity={1} />
          <Stop offset="100%" stopColor="#E6A800" stopOpacity={1} />
        </LinearGradient>
        <LinearGradient id="beerGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#F5C518" stopOpacity={0.95} />
          <Stop offset="100%" stopColor="#C8860A" stopOpacity={1} />
        </LinearGradient>
      </Defs>

      {/* Background */}
      <Rect width="1024" height="1024" rx="220" fill="#0f0f0f" />

      {/* Trophy body */}
      <Path d="M312 760 L355 440 L669 440 L712 760 Z" fill="#1a1a1a" stroke="#F5C518" strokeWidth="8" />

      {/* Trophy stem */}
      <Rect x="462" y="760" width="100" height="80" fill="#1a1a1a" stroke="#F5C518" strokeWidth="8" />

      {/* Trophy base */}
      <Rect x="380" y="836" width="264" height="50" rx="12" fill="#F5C518" />

      {/* Trophy handles */}
      <Path d="M355 470 Q260 470 260 570 Q260 670 355 670" fill="none" stroke="#F5C518" strokeWidth="22" strokeLinecap="round" />
      <Path d="M669 470 Q764 470 764 570 Q764 670 669 670" fill="none" stroke="#F5C518" strokeWidth="22" strokeLinecap="round" />

      {/* Beer fill */}
      <Path d="M362 650 L372 510 L652 510 L662 650 Z" fill="#C8860A" />

      {/* Foam */}
      <Circle cx="448" cy="502" r="28" fill="white" />
      <Circle cx="496" cy="494" r="34" fill="white" />
      <Circle cx="548" cy="497" r="30" fill="white" />
      <Circle cx="594" cy="505" r="22" fill="white" />
      <Circle cx="422" cy="510" r="18" fill="white" />

      {/* Star */}
      <Polygon
        points="512,430 526,468 568,468 535,492 547,530 512,507 477,530 489,492 456,468 498,468"
        fill="#F5C518"
        stroke="#E6A800"
        strokeWidth="3"
      />

      {/* MVB text */}
      <Text
        x="512"
        y="390"
        fontFamily="Georgia, serif"
        fontSize="120"
        fontWeight="bold"
        fill="#F5C518"
        textAnchor="middle"
      >MVB</Text>
    </Svg>
  );
}