import WidgetKit
import SwiftUI

// Uygulama veriyi app group'a "widgetData" anahtarıyla JSON olarak yazar (src/widget/ios.ts).
private let group = "group.com.meikai.homezy"

struct WTask: Codable, Hashable {
    var emoji: String
    var name: String
    var room: String
    var label: String
    var late: Bool
}

struct WData: Codable {
    var tasks: [WTask]
    var left: Int
    var done: Int
    var streak: Int
    var tip: String
    var title: String
}

extension WData {
    static let empty = WData(tasks: [], left: 0, done: 0, streak: 0, tip: "Homezy'yi açıp bugünü başlat.", title: "Bugün")
    static func load() -> WData {
        guard let s = UserDefaults(suiteName: group)?.string(forKey: "widgetData"),
              let d = s.data(using: .utf8),
              let v = try? JSONDecoder().decode(WData.self, from: d) else { return .empty }
        return v
    }
}

struct Entry: TimelineEntry {
    let date: Date
    let data: WData
}

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> Entry { Entry(date: Date(), data: .empty) }
    func getSnapshot(in context: Context, completion: @escaping (Entry) -> Void) {
        completion(Entry(date: Date(), data: WData.load()))
    }
    func getTimeline(in context: Context, completion: @escaping (Timeline<Entry>) -> Void) {
        let next = Calendar.current.date(byAdding: .minute, value: 30, to: Date())!
        completion(Timeline(entries: [Entry(date: Date(), data: WData.load())], policy: .after(next)))
    }
}

private let navy = Color(red: 0x28 / 255, green: 0x30 / 255, blue: 0x44 / 255)
private let mint = Color(red: 0xEB / 255, green: 0xF5 / 255, blue: 0xEE / 255)
private let late = Color(red: 0xE5 / 255, green: 0x8C / 255, blue: 0x7E / 255)

struct WidgetView: View {
    @Environment(\.widgetFamily) var family
    let e: Entry

    var body: some View {
        let d = e.data
        let rows = family == .systemSmall ? 2 : 4
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text("Homezy").font(.system(size: 14, weight: .heavy, design: .rounded))
                Spacer()
                Text("🔥 \(d.streak)").font(.system(size: 13, weight: .bold, design: .rounded))
            }
            if d.tasks.isEmpty {
                Text("Bugün iş kalmadı 🥰").font(.system(size: 14, weight: .semibold, design: .rounded))
                Spacer(minLength: 0)
                Text("🦜 \(d.tip)").font(.system(size: 11)).lineLimit(3).opacity(0.8)
            } else {
                Text("\(d.left) iş kaldı").font(.system(size: 12, weight: .semibold, design: .rounded)).opacity(0.8)
                ForEach(Array(d.tasks.prefix(rows).enumerated()), id: \.offset) { _, t in
                    HStack(spacing: 6) {
                        Text(t.emoji).font(.system(size: 14))
                        Text(t.name).font(.system(size: 13, weight: .semibold, design: .rounded)).lineLimit(1)
                        Spacer(minLength: 0)
                        if family != .systemSmall && !t.label.isEmpty {
                            Text(t.label).font(.system(size: 11, weight: .bold)).foregroundColor(t.late ? late : mint.opacity(0.7))
                        }
                    }
                }
                Spacer(minLength: 0)
            }
        }
        .foregroundColor(mint)
        .padding(14)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .widgetBackground(navy)
    }
}

extension View {
    func widgetBackground(_ c: Color) -> AnyView {
        if #available(iOS 17.0, *) {
            return AnyView(containerBackground(c, for: .widget))
        }
        return AnyView(background(c))
    }
}

@main
struct HomezyWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "HomezyWidget", provider: Provider()) { entry in
            WidgetView(e: entry)
        }
        .configurationDisplayName("Homezy · Bugün")
        .description("Bugünün işleri, serin ve günün cümlesi.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
