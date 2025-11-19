import React from 'react';
import Svg, { Path, Circle, Rect, G, Defs, Filter, FeGaussianBlur, FeColorMatrix } from 'react-native-svg';

interface IconProps {
  color: string;
  size?: number;
  active?: boolean;
}

export const ChatIcon: React.FC<IconProps> = ({ color, size = 24, active = false }) => {
  return (
    <Svg width={size} height={(size * 23) / 24} viewBox="0 0 24 23" fill="none">
      <Defs>
        <Filter id="chatGlow" x="-50%" y="-50%" width="200%" height="200%">
          <FeGaussianBlur stdDeviation="0.5" />
          <FeColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0" />
        </Filter>
      </Defs>
      <G filter="url(#chatGlow)">
        <Path d="M19.1818 8.36364C19.1818 6.14546 18.3007 4.01814 16.7322 2.44965C15.1637 0.881166 13.0364 0 10.8182 0C8.60001 0 6.47268 0.881166 4.9042 2.44965C3.33571 4.01814 2.45454 6.14546 2.45454 8.36364C2.45454 9.81818 2.69697 11.0303 3.18182 12C1.72727 12.9697 1 13.9394 1 14.9091C1 15.3939 1.48485 15.6364 2.45454 15.6364H7.54546C6.09091 9.81818 12.6364 4 19.1818 8.36364Z" fill={color} />
        <Path d="M20.6364 14.1818C20.6364 12.6387 20.0234 11.1589 18.9323 10.0677C17.8411 8.97662 16.3613 8.36364 14.8182 8.36364C13.2751 8.36364 11.7952 8.97662 10.7041 10.0677C9.61298 11.1589 9 12.6387 9 14.1818C9 15.7249 9.61298 17.2048 10.7041 18.2959C11.7952 19.387 13.2751 20 14.8182 20H20.6364C21.6061 20 22.0909 19.7576 22.0909 19.2727C22.0909 18.3567 21.4419 17.4406 20.1438 16.5246C20.4656 15.7932 20.6364 14.9963 20.6364 14.1818Z" fill={color} />
      </G>
    </Svg>
  );
};

export const LiveIcon: React.FC<IconProps> = ({ color, size = 24, active = false }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M21 6h-7.59l3.29-3.29L16 2l-4 4-4-4-.71.71L10.59 6H3c-1.1 0-2 .89-2 2v12c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.11-.9-2-2-2zm0 14H3V8h18v12z"
      stroke={color}
      strokeWidth={active ? 2.2 : 1.8}
      fill="none"
    />
  </Svg>
);

export const MusicIcon: React.FC<IconProps> = ({ color, size = 24, active = false }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle 
      cx="5.5" 
      cy="17.5" 
      r="2.5" 
      stroke={color}
      strokeWidth={active ? 2.2 : 1.8}
      fill="none"
    />
    <Path
      d="M8 17.5V6L21 3V15.5"
      stroke={color}
      strokeWidth={active ? 2.2 : 1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const GoldMinerIcon: React.FC<IconProps> = ({ color, size = 24, active = false }) => {
  const height = Math.round(size * (21 / 19));
  return (
    <Svg width={size} height={height} viewBox="0 0 19 21" fill="none">
      <Path fillRule="evenodd" clipRule="evenodd" d="M10 1L5 6V14.3333L10 19.3333V15.8333L7.5 13.3333V7L10 4.5V1ZM12.5 13.3333L15 14.3333V6L12.5 7V13.3333Z" fill={color} />
      <Path fillRule="evenodd" clipRule="evenodd" d="M3.33333 16.8333C3.58333 16.8333 3.75 16.6667 3.75 16.4167V15.5833C3.75 15.3333 3.58333 15.1667 3.33333 15.1667C3.08333 15.1667 2.91667 15.3333 2.91667 15.5833V16.4167C2.91667 16.5833 3.08333 16.8333 3.33333 16.8333ZM3.33333 20.1667C3.58333 20.1667 3.75 20 3.75 19.75V18.9167C3.75 18.6667 3.58333 18.5 3.33333 18.5C3.08333 18.5 2.91667 18.6667 2.91667 18.9167V19.75C2.91667 19.9167 3.08333 20.1667 3.33333 20.1667ZM4.16667 17.6667C4.16667 17.9167 4.33333 18.0833 4.58333 18.0833H5.41667C5.66667 18.0833 5.83333 17.8333 5.83333 17.6667C5.83333 17.4167 5.66667 17.25 5.41667 17.25H4.58333C4.33333 17.25 4.16667 17.4167 4.16667 17.6667ZM0.833333 17.6667C0.833333 17.9167 1 18.0833 1.25 18.0833H2.08333C2.33333 18.0833 2.5 17.8333 2.5 17.6667C2.5 17.4167 2.33333 17.25 2.08333 17.25H1.25C1 17.25 0.833333 17.4167 0.833333 17.6667ZM1.66667 11L2.25 12.0833L3.33333 12.6667L2.25 13.25L1.66667 14.3333L1.08333 13.25L0 12.6667L1.08333 12.0833L1.66667 11ZM8.33333 12.4167V12.9167L10 14.5833L11.6667 12.9167V9.08333L8.33333 12.4167ZM8.33333 11.25L11.6667 7.91667V7.41667L11.5833 7.25L8.33333 10.5V11.25ZM10.9167 6.66667L10 5.75L8.33333 7.41667V9.33333L10.9167 6.66667ZM12.5 7L15 6L10 1V4.5L12.5 7ZM12.5 13.3333L15 14.3333L10 19.3333V15.8333L12.5 13.3333Z" fill={color} />
      <Path d="M17.375 1.625L16.5 0L15.625 1.625L14 2.5L15.625 3.375L16.5 5L17.375 3.375L19 2.5L17.375 1.625Z" fill={color} />
    </Svg>
  );
};

export const SlotsIcon: React.FC<IconProps> = ({ color, size = 24, active = false }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M4 3h16a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zm1 2v14h14V5H5zm2 6h10v2H7v-2z"
      stroke={color}
      strokeWidth={active ? 2.2 : 1.8}
      fill="none"
    />
  </Svg>
);

export const LeaderboardIcon: React.FC<IconProps> = ({ color, size = 24, active = false }) => {
  const height = size * (21 / 23);
  return (
    <Svg width={size} height={height} viewBox="0 0 23 21" fill="none">
      <Defs>
        <Filter id="leaderGlow" x="-50%" y="-50%" width="200%" height="200%">
          <FeGaussianBlur stdDeviation="0.5" />
          <FeColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0" />
        </Filter>
      </Defs>
      <G filter="url(#leaderGlow)">
        <Path d="M12.6091 1.85028L11.8347 0.216615C11.7067 -0.0670556 11.3064 -0.0773087 11.1653 0.216615L10.3909 1.85028L8.67484 2.10661C8.36969 2.15446 8.23844 2.5475 8.46484 2.78332L9.71172 4.04787L9.41641 5.8285C9.37047 6.14635 9.68547 6.39243 9.96766 6.24546L11.5066 5.39787L13.0356 6.23179C13.3178 6.37875 13.6361 6.13268 13.5869 5.81483L13.2916 4.0342L14.5384 2.78332C14.7616 2.55091 14.6336 2.15788 14.3284 2.10661L12.6123 1.85028H12.6091ZM9.4 8.75065C8.81922 8.75065 8.35 9.23938 8.35 9.84432V16.4063C8.35 17.0113 8.81922 17.5 9.4 17.5H13.6C14.1808 17.5 14.65 17.0113 14.65 16.4063V9.84432C14.65 9.23938 14.1808 8.75065 13.6 8.75065H9.4ZM2.05 10.938C1.46922 10.938 1 11.4267 1 12.0317V16.4063C1 17.0113 1.46922 17.5 2.05 17.5H6.25C6.83078 17.5 7.3 17.0113 7.3 16.4063V12.0317C7.3 11.4267 6.83078 10.938 6.25 10.938H2.05ZM15.7 14.219V16.4063C15.7 17.0113 16.1692 17.5 16.75 17.5H20.95C21.5308 17.5 22 17.0113 22 16.4063V14.219C22 13.6141 21.5308 13.1253 20.95 13.1253H16.75C16.1692 13.1253 15.7 13.6141 15.7 14.219Z" fill={color} />
      </G>
    </Svg>
  );
};

export const ShopIcon: React.FC<IconProps> = ({ color, size = 24, active = false }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z"
      stroke={color}
      strokeWidth={active ? 2.2 : 1.8}
      fill="none"
    />
  </Svg>
);