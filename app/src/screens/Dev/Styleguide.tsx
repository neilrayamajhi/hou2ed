import React, { useState } from "react";
import { ScrollView, View, Text, StyleSheet, SafeAreaView } from "react-native";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Chip from "../../components/ui/Chip";
import Badge from "../../components/ui/Badge";
import Card from "../../components/ui/Card";
import Toggle from "../../components/ui/Toggle";
import Checkbox from "../../components/ui/Checkbox";
import ModalSheet from "../../components/ui/ModalSheet";
import { useToast } from "../../components/ui/Toast";

export default function Styleguide() {
  const { showToast } = useToast();
  const [toggleValue, setToggleValue] = useState(false);
  const [checkboxValue, setCheckboxValue] = useState(false);
  const [selectedChip, setSelectedChip] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [passwordValue, setPasswordValue] = useState("");

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>HOU2ED UI Components</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Buttons</Text>
          <View style={styles.row}>
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
          </View>
          <View style={styles.row}>
            <Button variant="primary" size="lg">
              Large
            </Button>
            <Button variant="primary" loading>
              Loading
            </Button>
            <Button variant="primary" disabled>
              Disabled
            </Button>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Inputs</Text>
          <Input
            label="Email"
            placeholder="Enter your email"
            value={inputValue}
            onChangeText={setInputValue}
            helpText="We'll never share your email"
          />
          <Input
            label="Password"
            placeholder="Enter your password"
            value={passwordValue}
            onChangeText={setPasswordValue}
            secureTextEntry
            showPasswordToggle
          />
          <Input
            label="With Error"
            placeholder="Enter something"
            error="This field is required"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Chips</Text>
          <View style={styles.row}>
            <Chip
              selected={selectedChip === 0}
              onPress={() => setSelectedChip(0)}
            >
              Immediate
            </Chip>
            <Chip
              selected={selectedChip === 1}
              onPress={() => setSelectedChip(1)}
            >
              Free
            </Chip>
            <Chip
              selected={selectedChip === 2}
              onPress={() => setSelectedChip(2)}
            >
              Veterans
            </Chip>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Badges</Text>
          <View style={styles.row}>
            <Badge type="available">Available</Badge>
            <Badge type="full">Full</Badge>
            <Badge type="verified" />
            <Badge type="facility">Housing</Badge>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Card</Text>
          <Card>
            <Text style={styles.cardTitle}>Card Title</Text>
            <Text style={styles.cardText}>
              This is a card component with gold border and black background.
            </Text>
          </Card>
          <View style={{ marginTop: 16 }}>
            <Card
              header={<Text style={styles.cardTitle}>With Header</Text>}
              body={
                <Text style={styles.cardText}>Card body content goes here</Text>
              }
              footer={
                <View style={styles.row}>
                  <Button variant="ghost" style={{ flex: 1 }}>
                    Cancel
                  </Button>
                  <Button variant="primary" style={{ flex: 1, marginLeft: 8 }}>
                    Confirm
                  </Button>
                </View>
              }
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Toggle & Checkbox</Text>
          <View style={styles.controlRow}>
            <Text style={styles.label}>Toggle:</Text>
            <Toggle value={toggleValue} onValueChange={setToggleValue} />
          </View>
          <View style={styles.controlRow}>
            <Text style={styles.label}>Checkbox:</Text>
            <Checkbox value={checkboxValue} onValueChange={setCheckboxValue} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Toast Messages</Text>
          <View style={styles.row}>
            <Button
              variant="primary"
              onPress={() => showToast("Success!", "success")}
            >
              Success
            </Button>
            <Button
              variant="secondary"
              onPress={() => showToast("Error occurred", "error")}
            >
              Error
            </Button>
            <Button
              variant="ghost"
              onPress={() => showToast("Warning!", "warning")}
            >
              Warning
            </Button>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Modal Sheet</Text>
          <Button variant="primary" onPress={() => setModalVisible(true)}>
            Open Modal Sheet
          </Button>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      <ModalSheet
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title="Settings"
      >
        <View style={styles.modalContent}>
          <Text style={styles.modalText}>This is a bottom sheet modal</Text>
          <Text style={styles.modalText}>
            You can drag down or tap the X to close
          </Text>
          <View style={{ marginTop: 20 }}>
            <Input label="Example Input" placeholder="Type something..." />
            <Button
              variant="primary"
              onPress={() => {
                setModalVisible(false);
                showToast("Modal closed!");
              }}
            >
              Close Modal
            </Button>
          </View>
        </View>
      </ModalSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#FFD700",
    marginBottom: 24,
    textAlign: "center",
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#FFD700",
    marginBottom: 16,
  },
  row: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
    flexWrap: "wrap",
  },
  controlRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  label: {
    color: "#FFFFFF",
    fontSize: 16,
    marginRight: 16,
    minWidth: 100,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFD700",
    marginBottom: 8,
  },
  cardText: {
    color: "#FFFFFF",
    fontSize: 14,
    lineHeight: 20,
  },
  modalContent: {
    padding: 16,
  },
  modalText: {
    color: "#FFFFFF",
    fontSize: 16,
    marginBottom: 8,
  },
});
