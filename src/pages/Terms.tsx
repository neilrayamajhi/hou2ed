import { container, section, styleHeading, styleBody } from '../theme/styles';

export function Terms() {
  return (
    <div style={{ ...container(), ...section }}>
      <h1 style={styleHeading}>Terms of Service</h1>
      <p style={{ ...styleBody, marginTop: 24 }}>Terms of service content will be added here.</p>
    </div>
  );
}
