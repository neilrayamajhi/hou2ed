import { container, section, styleHeading, styleBody } from '../theme/styles';

export function Privacy() {
  return (
    <div style={{ ...container(), ...section }}>
      <h1 style={styleHeading}>Privacy Policy</h1>
      <p style={{ ...styleBody, marginTop: 24 }}>Privacy policy content will be added here.</p>
    </div>
  );
}
