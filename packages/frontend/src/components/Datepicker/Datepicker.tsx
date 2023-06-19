import {
  Box,
  Button,
  Flex,
  Heading,
  IconButton,
  SimpleGrid,
  Tag,
} from "@chakra-ui/react";
import { useDatePicker } from "@rehookify/datepicker";
import { getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { MouseEvent, useState } from "react";
import { FaArrowLeft, FaArrowRight } from "react-icons/fa";

export default function DatePicker() {
  const [selectedDates, onDatesChange] = useState<Date[]>([]);

  const {
    data: { weekDays, calendars },
    propGetters: { dayButton, previousMonthButton, nextMonthButton },
  } = useDatePicker({
    selectedDates,
    onDatesChange,
    dates: { mode: "range" },
    calendar: {
      startDay: 1,
    },
  });

  const { year, month, days } = calendars[0];

  const onDayClick = (evt: MouseEvent<HTMLElement>, date: Date) => {
    // In case you need any action with evt
    evt.stopPropagation();

    // In case you need any additional action with date
    console.log(date);
  };

  return (
    <Box py={2}>
      <Flex justifyContent={"space-between"}>
        <IconButton
          icon={<FaArrowLeft />}
          aria-label="Left"
          {...previousMonthButton()}
          size="xs"
        />
        <Heading size="sm">
          {month} - {year}
        </Heading>
        <IconButton
          icon={<FaArrowRight />}
          aria-label="Right"
          {...nextMonthButton()}
          size="xs"
        />
      </Flex>
      <SimpleGrid columns={7} spacing={2}>
        {weekDays.map((day) => (
          <Heading size="sm" key={`${month}-${day}`}>
            {day}
          </Heading>
        ))}
        {days.map((dpDay) => (
          <Tag
            as="button"
            {...dayButton(dpDay, { onClick: onDayClick })}
            key={dpDay.$date.toDateString()}
            colorScheme={
              dpDay.selected ||
              dpDay.range === "in-range" ||
              dpDay.range === "will-be-in-range"
                ? "blue"
                : undefined
            }
            variant={
              dpDay.selected ||
              dpDay.range === "range-start" ||
              dpDay.range === "range-end" ||
              dpDay.range === "will-be-range-end" ||
              dpDay.range === "will-be-range-start"
                ? "solid"
                : undefined
            }
            justifyContent={"center"}
          >
            {dpDay.day}
          </Tag>
        ))}
      </SimpleGrid>
    </Box>
  );
}
