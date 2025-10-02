import React, { useRef, useState } from 'react';
import { ScrollView, View, Dimensions, StyleSheet } from 'react-native';

interface CarouselProps<T> {
  ref?: any;
  data: T[];
  renderItem: ({ item, index }: { item: T; index: number }) => React.ReactNode;
  sliderWidth: number;
  itemWidth: number;
  onSnapToItem?: (index: number) => void;
  firstItem?: number;
  inactiveSlideScale?: number;
  inactiveSlideOpacity?: number;
  contentContainerCustomStyle?: any;
  loop?: boolean;
}

function Carousel<T>({
  data,
  renderItem,
  sliderWidth,
  itemWidth,
  onSnapToItem,
  firstItem = 0,
  inactiveSlideScale = 1,
  inactiveSlideOpacity = 1,
  contentContainerCustomStyle,
  loop = false,
}: CarouselProps<T>) {
  const [currentIndex, setCurrentIndex] = useState(firstItem);
  const scrollViewRef = useRef<ScrollView>(null);

  const handleScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const newIndex = Math.round(offsetX / itemWidth);
    if (newIndex !== currentIndex && newIndex >= 0 && newIndex < data.length) {
      setCurrentIndex(newIndex);
      onSnapToItem?.(newIndex);
    }
  };

  return (
    <ScrollView
      ref={scrollViewRef}
      horizontal
      pagingEnabled
      showsHorizontalScrollIndicator={false}
      onMomentumScrollEnd={handleScroll}
      contentContainerStyle={[styles.container, contentContainerCustomStyle]}
      snapToInterval={itemWidth}
      decelerationRate="fast"
    >
      {data.map((item, index) => (
        <View key={index} style={{ width: itemWidth }}>
          {renderItem({ item, index })}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
});

export default Carousel;