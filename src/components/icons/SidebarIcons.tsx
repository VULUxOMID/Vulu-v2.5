import React from 'react';
import Svg, { Path, Circle, Rect, G, Defs, Filter, FeGaussianBlur, FeColorMatrix, FeFlood, FeOffset, FeComposite, FeBlend } from 'react-native-svg';

interface IconProps {
  color: string;
  size?: number;
  active?: boolean;
}

export const ChatIcon: React.FC<IconProps> = ({ color, size = 24, active = false }) => {
  const width = size;
  const height = Math.round((size * 23) / 24);
  const fillColor = active ? '#FFFFFF' : color;
  return (
    <Svg width={width} height={height} viewBox="0 0 24 23" fill="none">
      <Defs>
        <Filter id="chatDropShadow" x="-50%" y="-50%" width="200%" height="200%">
          <FeFlood floodOpacity="0" />
          <FeColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" />
          <FeOffset dy="2" />
          <FeGaussianBlur stdDeviation={active ? 0.8 : 0.5} />
          <FeComposite in2="SourceAlpha" operator="out" />
          <FeColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0" />
          <FeBlend mode="plus-darker" in2="BackgroundImageFix" />
          <FeBlend mode="normal" in="SourceGraphic" />
        </Filter>
      </Defs>
      <G filter="url(#chatDropShadow)">
        <Path d="M19.1818 8.36364C19.1818 6.14546 18.3007 4.01814 16.7322 2.44965C15.1637 0.881166 13.0364 0 10.8182 0C8.60001 0 6.47268 0.881166 4.9042 2.44965C3.33571 4.01814 2.45454 6.14546 2.45454 8.36364C2.45454 9.81818 2.69697 11.0303 3.18182 12C1.72727 12.9697 1 13.9394 1 14.9091C1 15.3939 1.48485 15.6364 2.45454 15.6364H7.54546C6.09091 9.81818 12.6364 4 19.1818 8.36364Z" fill={fillColor} />
        <Path d="M20.6364 14.1818C20.6364 12.6387 20.0234 11.1589 18.9323 10.0677C17.8411 8.97662 16.3613 8.36364 14.8182 8.36364C13.2751 8.36364 11.7952 8.97662 10.7041 10.0677C9.61298 11.1589 9 12.6387 9 14.1818C9 15.7249 9.61298 17.2048 10.7041 18.2959C11.7952 19.387 13.2751 20 14.8182 20H20.6364C21.6061 20 22.0909 19.7576 22.0909 19.2727C22.0909 18.3567 21.4419 17.4406 20.1438 16.5246C20.4656 15.7932 20.6364 14.9963 20.6364 14.1818Z" fill={fillColor} />
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
  <Svg width={size} height={size} viewBox="0 0 22 22" fill="none">
    <Defs>
      <Filter id="musicDropShadow" x="-50%" y="-50%" width="200%" height="200%">
        <FeFlood floodOpacity="0" />
        <FeColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" />
        <FeOffset dy="2" />
        <FeGaussianBlur stdDeviation="0.5" />
        <FeComposite in2="SourceAlpha" operator="out" />
        <FeColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0" />
        <FeBlend mode="plus-darker" in2="BackgroundImageFix" />
        <FeBlend mode="normal" in="SourceGraphic" />
      </Filter>
    </Defs>
    <G filter="url(#musicDropShadow)">
      <Path d="M11 0C5.486 0 1 4.26074 1 9.50002V17.1C1 18.1488 1.895 19 3 19H5C6.104 19 7 18.1488 7 17.1V14.25C7 13.2012 6.104 12.35 5 12.35H3V9.50002C3 5.30859 6.589 1.9 11 1.9C15.411 1.9 19 5.30859 19 9.50002V12.35H17C15.896 12.35 15 13.2012 15 14.25V17.1C15 18.1488 15.896 19 17 19H19C20.104 19 21 18.1488 21 17.1V9.50002C21 4.26074 16.514 0 11 0Z" fill={active ? '#FFFFFF' : color} />
    </G>
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

export const SlotsIcon: React.FC<IconProps> = ({ color, size = 24, active = false }) => {
  const fillColor = active ? '#FFFFFF' : color;
  const reelColor = active ? '#1C1D23' : '#D2D6DC';
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Defs>
        <Filter id="slotsDropShadow" x="-50%" y="-50%" width="200%" height="200%">
          <FeFlood floodOpacity="0" />
          <FeColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" />
          <FeOffset dy="2" />
          <FeGaussianBlur stdDeviation="0.5" />
          <FeComposite in2="SourceAlpha" operator="out" />
          <FeColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0" />
          <FeBlend mode="plus-darker" in2="BackgroundImageFix" />
          <FeBlend mode="normal" in="SourceGraphic" />
        </Filter>
      </Defs>
      <G filter="url(#slotsDropShadow)">
        <Rect x="2" y="4" width="16" height="12" rx="2" fill={fillColor} />
        <Rect x="4" y="7" width="3.5" height="6" rx="1" fill={reelColor} />
        <Rect x="9" y="7" width="3.5" height="6" rx="1" fill={reelColor} />
        <Rect x="14" y="7" width="3.5" height="6" rx="1" fill={reelColor} />
        <Circle cx="20" cy="7" r="1.6" fill={fillColor} />
        <Path d="M20 8.8V14.8" stroke={fillColor} strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" />
      </G>
    </Svg>
  );
};

export const LeaderboardIcon: React.FC<IconProps> = ({ color, size = 24, active = false }) => {
  const height = size * (21 / 23);
  return (
    <Svg width={size} height={height} viewBox="0 0 23 21" fill="none">
      <Defs>
        <Filter id="leaderDropShadow" x="-50%" y="-50%" width="200%" height="200%">
          <FeFlood floodOpacity="0" />
          <FeColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" />
          <FeOffset dy="2" />
          <FeGaussianBlur stdDeviation="0.5" />
          <FeComposite in2="SourceAlpha" operator="out" />
          <FeColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0" />
          <FeBlend mode="plus-darker" in2="BackgroundImageFix" />
          <FeBlend mode="normal" in="SourceGraphic" />
        </Filter>
      </Defs>
      <G filter="url(#leaderDropShadow)">
        <Path
          d="M12.6091 1.85028L11.8347 0.216615C11.7067 -0.0670556 11.3064 -0.0773087 11.1653 0.216615L10.3909 1.85028L8.67484 2.10661C8.36969 2.15446 8.23844 2.5475 8.46484 2.78332L9.71172 4.04787L9.41641 5.8285C9.37047 6.14635 9.68547 6.39243 9.96766 6.24546L11.5066 5.39787L13.0356 6.23179C13.3178 6.37875 13.6361 6.13268 13.5869 5.81483L13.2916 4.0342L14.5384 2.78332C14.7616 2.55091 14.6336 2.15788 14.3284 2.10661L12.6123 1.85028H12.6091ZM9.4 8.75065C8.81922 8.75065 8.35 9.23938 8.35 9.84432V16.4063C8.35 17.0113 8.81922 17.5 9.4 17.5H13.6C14.1808 17.5 14.65 17.0113 14.65 16.4063V9.84432C14.65 9.23938 14.1808 8.75065 13.6 8.75065H9.4ZM2.05 10.938C1.46922 10.938 1 11.4267 1 12.0317V16.4063C1 17.0113 1.46922 17.5 2.05 17.5H6.25C6.83078 17.5 7.3 17.0113 7.3 16.4063V12.0317C7.3 11.4267 6.83078 10.938 6.25 10.938H2.05ZM15.7 14.219V16.4063C15.7 17.0113 16.1692 17.5 16.75 17.5H20.95C21.5308 17.5 22 17.0113 22 16.4063V14.219C22 13.6141 21.5308 13.1253 20.95 13.1253H16.75C16.1692 13.1253 15.7 13.6141 15.7 14.219Z"
          fill={active ? '#FFFFFF' : color}
          shapeRendering="crispEdges"
        />
      </G>
    </Svg>
  );
};

export const ShopIcon: React.FC<IconProps> = ({ color, size = 24, active = false }) => (
  <Svg width={size} height={Math.round((size * 19) / 20)} viewBox="0 0 20 19" fill="none">
    <Defs>
      <Filter id="shopDropShadow" x="-50%" y="-50%" width="200%" height="200%">
        <FeFlood floodOpacity="0" />
        <FeColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" />
        <FeOffset dy="2" />
        <FeGaussianBlur stdDeviation="0.5" />
        <FeComposite in2="SourceAlpha" operator="out" />
        <FeColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0" />
        <FeBlend mode="plus-darker" in2="BackgroundImageFix" />
        <FeBlend mode="normal" in="SourceGraphic" />
      </Filter>
    </Defs>
    <G filter="url(#shopDropShadow)">
      <Path d="M18.9668 5.03779C18.9667 5.03779 18.9667 5.03779 18.9667 5.03777L16.7115 1.0209C16.3575 0.390349 15.6907 0 14.9676 0H4.9658C4.24273 0 3.57597 0.390276 3.22194 1.02074L1.22294 4.58053C1.055 4.87959 0.948503 5.22125 1.0261 5.55535C1.23138 6.43911 1.9443 7.11111 2.76718 7.11111C3.74403 7.11111 4.56757 6.22223 4.56757 5.03666C4.56757 6.16221 5.39013 7.11111 6.36796 7.11111C7.34481 7.11111 8.16835 6.22223 8.16835 5.03666C8.16835 6.16221 8.9909 7.11111 9.96874 7.11111C10.9456 7.11111 11.7691 6.22223 11.7691 5.03666C11.7691 6.16221 12.5917 7.11111 13.5695 7.11111C14.5464 7.11111 15.3699 6.22223 15.3699 5.03666C15.3699 6.16221 16.1925 7.11111 17.1703 7.11111C18.1442 7.11111 18.9668 6.22225 18.9668 5.03782C18.9668 5.0378 18.9668 5.03778 18.9668 5.03779Z" fill={active ? '#FFFFFF' : color} />
      <Path d="M17.1671 9.48251C16.4362 9.48251 15.6241 9.99455 15.6241 10.7254V10.9097C15.6241 11.5121 15.1358 12.0005 14.5334 12.0005H13.9668H11.9668H9.9668H7.9668H5.9668L5.46501 12.0257C4.83609 12.0574 4.30883 11.556 4.30883 10.9263V10.7254C4.30883 9.99455 3.4968 9.48251 2.76593 9.48251C2.51494 9.48251 2.25195 9.69275 2.25195 9.94374V13.3181C2.25195 14.7994 3.45278 16.0003 4.93407 16.0003H15.0086C16.4841 16.0003 17.6802 14.8043 17.6804 13.3288L17.6809 9.94281C17.681 9.69247 17.4174 9.48251 17.1671 9.48251Z" fill={active ? '#FFFFFF' : color} />
    </G>
  </Svg>
);

export const PhoneIcon: React.FC<IconProps> = ({ color, size = 24, active = false }) => {
  const fillColor = active ? '#FFFFFF' : color;
  // For inactive state, use a gray color; for active, use white
  const detailColor = active ? '#0F1115' : '#AAAAAB';
  const height = Math.round((size * 32) / 17);
  
  return (
    <Svg width={size} height={height} viewBox="0 0 17 32" fill="none">
      <Defs>
        <Filter id="phoneDropShadow" x="-50%" y="-50%" width="200%" height="200%">
          <FeFlood floodOpacity="0" />
          <FeColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" />
          <FeOffset dy="2" />
          <FeGaussianBlur stdDeviation={active ? 0.8 : 0.5} />
          <FeComposite in2="SourceAlpha" operator="out" />
          <FeColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0" />
          <FeBlend mode="plus-darker" in2="BackgroundImageFix" />
          <FeBlend mode="normal" in="SourceGraphic" />
        </Filter>
      </Defs>
      <G filter="url(#phoneDropShadow)">
        {/* Phone body */}
        <Path d="M0 3C0 1.34315 1.34315 0 3 0H14C15.6569 0 17 1.34315 17 3V29C17 30.6569 15.6569 32 14 32H3C1.34315 32 0 30.6569 0 29V3Z" fill={fillColor} />
        {/* Top speaker dots */}
        <Circle cx="2.5" cy="3.5" r="1.5" fill={detailColor} />
        <Circle cx="6.5" cy="3.5" r="1.5" fill={detailColor} />
        <Circle cx="10.5" cy="3.5" r="1.5" fill={detailColor} />
        <Circle cx="14.5" cy="3.5" r="1.5" fill={detailColor} />
        {/* Screen separator line */}
        <Path d="M1 6.5C1 6.22386 1.22386 6 1.5 6H15.5C15.7761 6 16 6.22386 16 6.5C16 6.77614 15.7761 7 15.5 7H1.5C1.22386 7 1 6.77614 1 6.5Z" fill={detailColor} />
        {/* Screen area */}
        <Path d="M1 9C1 8.44772 1.44772 8 2 8H15C15.5523 8 16 8.44772 16 9V17C16 17.5523 15.5523 18 15 18H2C1.44772 18 1 17.5523 1 17V9Z" fill={detailColor} />
        {/* Home indicator line 1 */}
        <Path d="M1 20C1 19.4477 1.44772 19 2 19H15C15.5523 19 16 19.4477 16 20V21C16 21.5523 15.5523 22 15 22H2C1.44772 22 1 21.5523 1 21V20Z" fill={detailColor} />
        {/* Home indicator line 2 */}
        <Path d="M1 24C1 23.4477 1.44772 23 2 23H15C15.5523 23 16 23.4477 16 24V27C16 27.5523 15.5523 28 15 28H2C1.44772 28 1 27.5523 1 27V24Z" fill={detailColor} />
        {/* Bottom home button area */}
        <Path d="M6 31.5C6 31.2239 6.22386 31 6.5 31H10.5C10.7761 31 11 31.2239 11 31.5C11 31.7761 10.7761 32 10.5 32H6.5C6.22386 32 6 31.7761 6 31.5Z" fill={detailColor} />
      </G>
    </Svg>
  );
};