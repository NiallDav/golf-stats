"""Personal daily tracker. Run with: python daily_tracker.py"""

import calendar
import json
import os
import tkinter as tk
from datetime import date, timedelta
from pathlib import Path
from tkinter import messagebox


BG = "#10131d"
CARD = "#1b2130"
FIELD = "#2b3446"
TEXT = "#eff5fb"
MUTED = "#a5aec2"
ACCENT = "#a99cff"
SELECTED = "#6157bd"
# GitHub Primer's default contribution graph: zero, level 1, level 2, level 4.
LEVELS = ("#eff2f5", "#aceebb", "#4ac26b", "#116329")
TASKS = ("Weights", "Creatine", "Ate enough")
DATA_PATH = Path.home() / "Daily Tracker" / "data.json"


class Tracker(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("Daily Tracker")
        self.geometry("1050x670")
        self.minsize(880, 620)
        self.configure(bg=BG)
        self.selected = date.today()
        self.data = self.load()
        self.task_buttons = {}
        self.build()
        self.refresh()

    def load(self):
        try:
            with DATA_PATH.open(encoding="utf-8") as f:
                value = json.load(f)
            return value if isinstance(value, dict) else {}
        except FileNotFoundError:
            return {}
        except (OSError, ValueError) as exc:
            messagebox.showwarning("Could not load data", f"Your saved file was left untouched.\n{exc}")
            return {}

    def save(self):
        try:
            DATA_PATH.parent.mkdir(parents=True, exist_ok=True)
            temp = DATA_PATH.with_suffix(".tmp")
            with temp.open("w", encoding="utf-8") as f:
                json.dump(self.data, f, indent=2, sort_keys=True)
            os.replace(temp, DATA_PATH)
        except OSError as exc:
            messagebox.showerror("Could not save", str(exc))

    def label(self, parent, text, size=12, color=TEXT, weight="normal", **kw):
        return tk.Label(parent, text=text, font=("Segoe UI", size, weight), fg=color,
                        bg=parent.cget("bg"), **kw)

    def button(self, parent, text, command, bg=FIELD, fg=TEXT, width=None):
        return tk.Button(parent, text=text, command=command, bg=bg, fg=fg,
                         activebackground=ACCENT, activeforeground=BG, relief="flat",
                         bd=0, font=("Segoe UI", 11, "bold"), padx=14, pady=9,
                         cursor="hand2", width=width)

    def build(self):
        outer = tk.Frame(self, bg=BG, padx=28, pady=20)
        outer.pack(fill="both", expand=True)
        self.label(outer, "Daily Tracker", 25, weight="bold").pack(anchor="w")
        self.label(outer, "Your daily habits and progress, all in one place.", 11, MUTED).pack(anchor="w", pady=(0, 17))

        bar = tk.Frame(outer, bg=BG)
        bar.pack(fill="x", pady=(0, 16))
        self.button(bar, "‹", lambda: self.change_day(-1), width=2).pack(side="left")
        self.date_label = self.label(bar, "", 15, weight="bold")
        self.date_label.pack(side="left", padx=16)
        self.button(bar, "›", lambda: self.change_day(1), width=2).pack(side="left")
        self.button(bar, "Today", self.go_today).pack(side="right")

        content = tk.Frame(outer, bg=BG)
        content.pack(fill="x", pady=(0, 14))
        content.columnconfigure(0, weight=6, uniform="panels")
        content.columnconfigure(1, weight=5, uniform="panels")

        left = tk.Frame(content, bg=BG)
        left.grid(row=0, column=0, sticky="nsew", padx=(0, 8))
        calendar_card = tk.Frame(content, bg=CARD, padx=18, pady=16)
        calendar_card.grid(row=0, column=1, sticky="nsew", padx=(8, 0))
        month_bar = tk.Frame(calendar_card, bg=CARD)
        month_bar.pack(fill="x", pady=(0, 10))
        self.label(month_bar, "ACTIVITY CALENDAR", 10, ACCENT, "bold").pack(side="left")
        self.button(month_bar, "›", lambda: self.change_month(1), width=2).pack(side="right")
        self.month_label = self.label(month_bar, "", 12, weight="bold")
        self.month_label.pack(side="right", padx=12)
        self.button(month_bar, "‹", lambda: self.change_month(-1), width=2).pack(side="right")
        self.calendar_grid = tk.Frame(calendar_card, bg=CARD)
        self.calendar_grid.pack(fill="x")
        legend = tk.Frame(calendar_card, bg=CARD)
        legend.pack(anchor="w", pady=(10, 0))
        self.label(legend, "Less", 9, MUTED).pack(side="left", padx=(0, 6))
        for color in LEVELS:
            tk.Label(legend, bg=color, width=2, height=1).pack(side="left", padx=2)
        self.label(legend, "More", 9, MUTED).pack(side="left", padx=(6, 0))

        card = tk.Frame(left, bg=CARD, padx=20, pady=18)
        card.pack(fill="x", pady=(0, 14))
        self.label(card, "DAILY CHECKLIST", 10, ACCENT, "bold").pack(anchor="w", pady=(0, 12))
        task_row = tk.Frame(card, bg=CARD)
        task_row.pack(fill="x")
        for index, task in enumerate(TASKS):
            task_row.columnconfigure(index, weight=1, uniform="tasks")
            btn = tk.Button(task_row, command=lambda name=task: self.set_task(name),
                            relief="flat", bd=0, anchor="center", padx=8, pady=18,
                            font=("Segoe UI", 12, "bold"), cursor="hand2")
            btn.grid(row=0, column=index, sticky="ew",
                     padx=(0 if index == 0 else 5, 0 if index == 2 else 5))
            self.task_buttons[task] = btn
        self.summary = self.label(card, "", 11, MUTED)
        self.summary.pack(anchor="w", pady=(10, 0))

        weight_card = tk.Frame(left, bg=CARD, padx=20, pady=18)
        weight_card.pack(fill="x")
        self.label(weight_card, "BODY WEIGHT", 10, ACCENT, "bold").pack(anchor="w")
        row = tk.Frame(weight_card, bg=CARD)
        row.pack(fill="x", pady=(11, 4))
        self.weight_var = tk.StringVar()
        self.weight_entry = tk.Entry(row, textvariable=self.weight_var, bg=FIELD, fg=TEXT,
                                     insertbackground=TEXT, relief="flat", font=("Segoe UI", 15),
                                     width=10, justify="center")
        self.weight_entry.pack(side="left", ipady=8)
        self.weight_entry.bind("<Return>", lambda _: self.set_weight())
        self.label(row, "kg", 12, MUTED).pack(side="left", padx=10)
        self.button(row, "Save weight", self.set_weight, ACCENT, BG).pack(side="left", padx=(12, 0))
        self.button(row, "Clear", self.clear_weight).pack(side="left", padx=8)
        self.label(weight_card, "Weight for the selected day", 10, MUTED).pack(anchor="w", pady=(8, 0))

        chart_card = tk.Frame(outer, bg=CARD, padx=20, pady=14)
        chart_card.pack(fill="both", expand=True)
        self.label(chart_card, "WEIGHT TREND", 10, ACCENT, "bold").pack(anchor="w")
        self.chart = tk.Canvas(chart_card, bg=CARD, highlightthickness=0, height=135)
        self.chart.pack(fill="both", expand=True, pady=(8, 0))
        self.chart.bind("<Configure>", lambda _: self.draw_chart())
        self.label(outer, f"Saved on this computer: {DATA_PATH}", 9, MUTED).pack(anchor="w", pady=(12, 0))

    def record(self):
        return self.data.get(self.selected.isoformat(), {})

    def refresh(self):
        self.date_label.config(text=self.selected.strftime("%A, %d %B %Y"))
        item = self.record()
        for task, btn in self.task_buttons.items():
            checked = bool(item.get(task, False))
            btn.config(text=task,
                       bg=SELECTED if checked else FIELD, fg=TEXT if checked else MUTED,
                       activebackground=SELECTED, activeforeground=TEXT)
        count = sum(bool(item.get(task, False)) for task in TASKS)
        self.summary.config(text=f"{count} of {len(TASKS)} completed")
        self.weight_var.set(str(item.get("weight", "")))
        self.draw_calendar()
        self.draw_chart()

    def draw_calendar(self):
        grid = self.calendar_grid
        for widget in grid.winfo_children():
            widget.destroy()
        self.month_label.config(text=self.selected.strftime("%B %Y"))
        for col, name in enumerate(("Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun")):
            grid.columnconfigure(col, weight=1, uniform="days")
            self.label(grid, name, 10, MUTED).grid(row=0, column=col, pady=(0, 5))
        for row, week in enumerate(calendar.monthcalendar(self.selected.year, self.selected.month), 1):
            for col, day in enumerate(week):
                if day == 0:
                    continue
                value = date(self.selected.year, self.selected.month, day)
                item = self.data.get(value.isoformat(), {})
                level = sum(bool(item.get(task, False)) for task in TASKS)
                selected = value == self.selected
                cell = tk.Button(grid, text=str(day),
                                 command=lambda picked=value: self.select_day(picked),
                                 bg=LEVELS[level], fg=TEXT if level == 3 else BG,
                                 activebackground=ACCENT,
                                 activeforeground=BG, relief="solid" if selected else "flat",
                                 bd=2 if selected else 0,
                                 highlightthickness=0, font=("Segoe UI", 11, "bold"),
                                 cursor="hand2")
                cell.grid(row=row, column=col, sticky="ew", padx=3, pady=2, ipady=1)

    def select_day(self, value):
        self.selected = value
        self.refresh()

    def change_month(self, delta):
        year = self.selected.year + (self.selected.month - 1 + delta) // 12
        month = (self.selected.month - 1 + delta) % 12 + 1
        day = min(self.selected.day, calendar.monthrange(year, month)[1])
        self.select_day(date(year, month, day))

    def change_day(self, days):
        self.selected += timedelta(days=days)
        self.refresh()

    def go_today(self):
        self.selected = date.today()
        self.refresh()

    def set_task(self, task):
        item = self.data.setdefault(self.selected.isoformat(), {})
        item[task] = not bool(item.get(task, False))
        self.save()
        self.refresh()

    def set_weight(self):
        try:
            value = float(self.weight_var.get().strip().replace(",", "."))
            if not 20 <= value <= 400:
                raise ValueError
        except ValueError:
            messagebox.showerror("Invalid weight", "Enter a weight in kg between 20 and 400.")
            return
        self.data.setdefault(self.selected.isoformat(), {})["weight"] = round(value, 2)
        self.save()
        self.refresh()

    def clear_weight(self):
        self.data.setdefault(self.selected.isoformat(), {}).pop("weight", None)
        self.save()
        self.refresh()

    def draw_chart(self):
        if not hasattr(self, "chart"):
            return
        c = self.chart
        c.delete("all")
        width, height = c.winfo_width(), c.winfo_height()
        if width < 100:
            return
        points = []
        for key, item in self.data.items():
            try:
                if "weight" in item:
                    points.append((date.fromisoformat(key), float(item["weight"])))
            except (TypeError, ValueError, AttributeError):
                continue
        points.sort()
        points = points[-30:]
        if not points:
            c.create_text(width / 2, height / 2, text="Save a weight to see your trend", fill=MUTED,
                          font=("Segoe UI", 12))
            return
        left, right, top, bottom = 48, width - 18, 15, height - 32
        values = [value for _, value in points]
        lo, hi = min(values) - 0.5, max(values) + 0.5
        def xy(index, value):
            return (left + index * (right - left) / max(len(points) - 1, 1),
                    bottom - (value - lo) / (hi - lo) * (bottom - top))
        for val in (lo, hi):
            y = xy(0, val)[1]
            c.create_line(left, y, right, y, fill=FIELD)
            c.create_text(3, y, anchor="w", text=f"{val:.1f}", fill=MUTED,
                          font=("Segoe UI", 9))
        coords = [xy(i, value) for i, (_, value) in enumerate(points)]
        if len(coords) > 1:
            c.create_line(*[v for pair in coords for v in pair], fill=ACCENT, width=3, smooth=False)
        for (x, y), (_, value) in zip(coords, points):
            c.create_oval(x - 4, y - 4, x + 4, y + 4, fill=ACCENT, outline=CARD)
        for index in sorted(set((0, len(points) - 1))):
            x, _ = coords[index]
            c.create_text(x, height - 13, text=points[index][0].strftime("%d %b"),
                          fill=MUTED, font=("Segoe UI", 9))


if __name__ == "__main__":
    Tracker().mainloop()
